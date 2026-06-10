import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TEAM_MEMBER_LIMITS,
  type TeamRole,
  permissionsForRole,
  type UserPermissionContext,
} from '@/lib/auth/permissions';
import type { PlanId } from '@/lib/plans';
import type { TeamInvitation, TeamMember } from './types';

type DbTeamMember = {
  id: string;
  company_id: string;
  user_id: string;
  role: TeamRole;
  status: string;
  invited_at?: string;
  accepted_at?: string;
  last_active_at?: string;
  users?: { email?: string; full_name?: string | null } | { email?: string; full_name?: string | null }[];
};

type DbInvitation = {
  id: string;
  company_id: string;
  email: string;
  role: TeamRole;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by?: string;
};

function mapUserJoin(
  raw: DbTeamMember['users']
): { email: string; fullName: string | null } {
  const u = Array.isArray(raw) ? raw[0] : raw;
  return {
    email: u?.email ?? '',
    fullName: u?.full_name ?? null,
  };
}

export function mapTeamMember(row: DbTeamMember): TeamMember {
  const user = mapUserJoin(row.users);
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    role: row.role,
    status: row.status as TeamMember['status'],
    email: user.email,
    fullName: user.fullName,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    lastActiveAt: row.last_active_at,
  };
}

export function mapInvitation(row: DbInvitation): TeamInvitation {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    role: row.role,
    token: row.token,
    status: row.status as TeamInvitation['status'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function isMissingTeamTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? error);
  return (
    msg.includes('team_members') ||
    msg.includes('42P01') ||
    msg.includes('PGRST205') ||
    error.code === '42P01'
  );
}

/** Resolver company_profiles.id for en bruker (team eller legacy eier). */
export async function resolveCompanyProfileId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (memberError && !isMissingTeamTable(memberError)) {
    console.warn('[samsiq team] resolveCompanyProfileId member:', memberError.message);
  } else if (member?.company_id) {
    return member.company_id;
  }

  const { data: owned, error: ownedError } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedError && !ownedError.message?.includes('company_profiles')) {
    console.warn('[samsiq team] resolveCompanyProfileId profile:', ownedError.message);
  }
  if (owned?.id) return owned.id;

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  return userRow?.company_id ?? null;
}

export async function getActiveTeamMember(
  supabase: SupabaseClient,
  userId: string,
  companyId?: string | null
): Promise<{ id: string; role: TeamRole; companyId: string } | null> {
  let query = supabase
    .from('team_members')
    .select('id, role, company_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.maybeSingle();
  if (error && !isMissingTeamTable(error)) {
    console.warn('[samsiq team] getActiveTeamMember:', error.message);
    return null;
  }
  if (!data) return null;
  const role = data.role as TeamRole;
  return {
    id: data.id,
    role,
    companyId: data.company_id,
  };
}

/**
 * Sikrer at eksisterende bedriftseiere får en owner-rad i team_members.
 * Kalles med admin-klient for å unngå RLS-problemer ved legacy-brukere.
 */
export async function bootstrapTeamForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingError) {
      if (isMissingTeamTable(existingError)) return;
      console.warn('[samsiq team] bootstrap lookup:', existingError.message);
      return;
    }
    if (existing?.id) return;

    const { data: owned, error: ownedError } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (ownedError || !owned?.id) return;

    await ensureOwnerTeamMember(supabase, userId, owned.id);
  } catch (err) {
    console.warn(
      '[samsiq team] bootstrap failed:',
      err instanceof Error ? err.message : err
    );
  }
}

/** Legacy fallback: profil-eier uten team_members-rad behandles som owner. */
export async function getUserPermissions(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPermissionContext | null> {
  const member = await getActiveTeamMember(supabase, userId);
  if (member) {
    const perms = permissionsForRole(member.role);
    return {
      role: member.role,
      companyId: member.companyId,
      ...perms,
    };
  }

  const companyId = await resolveCompanyProfileId(supabase, userId);
  if (!companyId) return null;

  return {
    role: 'owner',
    companyId,
    ...permissionsForRole('owner'),
  };
}

export async function listTeamMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(
      'id, company_id, user_id, role, status, invited_at, accepted_at, last_active_at'
    )
    .eq('company_id', companyId)
    .in('status', ['active', 'pending'])
    .order('accepted_at', { ascending: true, nullsFirst: false });

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .in('id', userIds);

  const userById = new Map(
    (users ?? []).map((u) => [
      u.id,
      { email: u.email as string, full_name: u.full_name as string | null },
    ])
  );

  return (data as DbTeamMember[]).map((row) =>
    mapTeamMember({
      ...row,
      users: userById.get(row.user_id),
    })
  );
}

export async function listPendingInvitations(
  supabase: SupabaseClient,
  companyId: string
): Promise<TeamInvitation[]> {
  const { data } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return ((data ?? []) as DbInvitation[]).map(mapInvitation);
}

export async function getSubscriptionPlanForCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<PlanId | 'enterprise' | null> {
  const { data: ownerProfile } = await supabase
    .from('company_profiles')
    .select('user_id')
    .eq('id', companyId)
    .maybeSingle();

  const ownerId = ownerProfile?.user_id;
  if (!ownerId) return null;

  const { data: owner } = await supabase
    .from('users')
    .select('subscription_plan')
    .eq('id', ownerId)
    .maybeSingle();

  const plan = owner?.subscription_plan as string | null;
  if (plan === 'starter' || plan === 'pro') return plan;
  if (plan === 'enterprise') return 'enterprise';
  return 'starter';
}

export async function countActiveTeamMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active');

  return count ?? 0;
}

export async function checkTeamLimit(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ allowed: boolean; limit: number; count: number; plan: PlanId | 'enterprise' }> {
  const plan = (await getSubscriptionPlanForCompany(supabase, companyId)) ?? 'starter';
  const limit = TEAM_MEMBER_LIMITS[plan];
  const count = await countActiveTeamMembers(supabase, companyId);
  const pendingInvites = await listPendingInvitations(supabase, companyId);
  const total = count + pendingInvites.length;
  return {
    allowed: total < limit,
    limit,
    count: total,
    plan,
  };
}

export async function ensureOwnerTeamMember(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) return;

  await supabase.from('team_members').insert({
    company_id: companyId,
    user_id: userId,
    role: 'owner',
    status: 'active',
    accepted_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  });

  await supabase
    .from('users')
    .update({ company_id: companyId })
    .eq('id', userId);
}

export async function touchMemberActivity(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error && !isMissingTeamTable(error)) {
    console.warn('[samsiq team] touchMemberActivity:', error.message);
  }
}
