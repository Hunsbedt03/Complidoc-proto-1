import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerProjectAccess } from '@/types/database';
import { findOrganizationIdByEmailDomain } from '@/lib/customer-portal/org';
import { sendCustomerProjectInviteEmail } from '@/lib/customer-portal/email';
import { getAppUrl } from '@/lib/appUrl';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';

export type CustomerAccessRow = CustomerProjectAccess & {
  organization_name?: string | null;
};

export async function listProjectCustomerAccess(
  projectId: string
): Promise<CustomerAccessRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from('customer_project_access')
    .select(
      'id, project_id, invited_email, customer_organization_id, customer_user_id, status, invited_by, invited_at, activated_at, customer_organizations(name)'
    )
    .eq('project_id', projectId)
    .neq('status', 'revoked')
    .order('invited_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const org = row.customer_organizations as { name?: string } | null;
    return {
      id: row.id,
      project_id: row.project_id,
      invited_email: row.invited_email,
      customer_organization_id: row.customer_organization_id,
      customer_user_id: row.customer_user_id,
      status: row.status,
      invited_by: row.invited_by,
      invited_at: row.invited_at,
      activated_at: row.activated_at,
      organization_name: org?.name ?? null,
    };
  });
}

export async function inviteCustomerToProject(input: {
  projectId: string;
  email: string;
  invitedBy: string;
  inviterName: string;
  projectName: string;
}): Promise<{ access: CustomerAccessRow; emailSent: boolean }> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const allowed = await assertSupplierCanAccessProject(input.invitedBy, input.projectId, admin);
  if (!allowed) throw new Error('Ingen tilgang til prosjektet');

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail.includes('@')) throw new Error('Ugyldig e-postadresse');

  const { data: existing } = await admin
    .from('customer_project_access')
    .select('id, status')
    .eq('project_id', input.projectId)
    .eq('invited_email', normalizedEmail)
    .maybeSingle();

  if (existing && existing.status !== 'revoked') {
    throw new Error('Denne e-posten er allerede invitert til prosjektet');
  }

  const orgId = await findOrganizationIdByEmailDomain(normalizedEmail);

  if (existing?.status === 'revoked') {
    const { data: reactivated, error: reactivateErr } = await admin
      .from('customer_project_access')
      .update({
        status: 'pending',
        customer_organization_id: orgId,
        customer_user_id: null,
        invited_by: input.invitedBy,
        invited_at: new Date().toISOString(),
        activated_at: null,
      })
      .eq('id', existing.id)
      .select(
        'id, project_id, invited_email, customer_organization_id, customer_user_id, status, invited_by, invited_at, activated_at'
      )
      .single();

    if (reactivateErr) throw reactivateErr;

    const registerUrl = `${getAppUrl().replace(/\/$/, '')}/app/register`;
    const emailResult = await sendCustomerProjectInviteEmail({
      to: normalizedEmail,
      supplierName: input.inviterName,
      projectName: input.projectName,
      registerUrl,
    });

    return {
      access: { ...reactivated, organization_name: null },
      emailSent: emailResult.sent,
    };
  }

  const { data: inserted, error } = await admin
    .from('customer_project_access')
    .insert({
      project_id: input.projectId,
      invited_email: normalizedEmail,
      customer_organization_id: orgId,
      status: 'pending',
      invited_by: input.invitedBy,
    })
    .select(
      'id, project_id, invited_email, customer_organization_id, customer_user_id, status, invited_by, invited_at, activated_at'
    )
    .single();

  if (error) throw error;

  const registerUrl = `${getAppUrl().replace(/\/$/, '')}/app/register`;
  const emailResult = await sendCustomerProjectInviteEmail({
    to: normalizedEmail,
    supplierName: input.inviterName,
    projectName: input.projectName,
    registerUrl,
  });

  return {
    access: { ...inserted, organization_name: null },
    emailSent: emailResult.sent,
  };
}

export async function revokeCustomerAccess(input: {
  projectId: string;
  accessId: string;
  userId: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const allowed = await assertSupplierCanAccessProject(input.userId, input.projectId, admin);
  if (!allowed) throw new Error('Ingen tilgang til prosjektet');

  const { error } = await admin
    .from('customer_project_access')
    .update({ status: 'revoked' })
    .eq('id', input.accessId)
    .eq('project_id', input.projectId);

  if (error) throw error;
}

export async function hasActiveCustomerAccess(projectId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { count } = await admin
    .from('customer_project_access')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'active');

  return (count ?? 0) > 0;
}

export async function assertCustomerProjectAccess(
  authUserId: string,
  projectId: string
): Promise<{ organizationIds: string[]; customerUserIds: string[] }> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const { data: memberships } = await admin
    .from('customer_users')
    .select('id, customer_organization_id')
    .eq('auth_user_id', authUserId);

  const orgIds = (memberships ?? []).map((m) => m.customer_organization_id);
  if (!orgIds.length) throw new Error('Ingen kundeorganisasjon');

  const { data: access } = await admin
    .from('customer_project_access')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .in('customer_organization_id', orgIds)
    .limit(1);

  if (!access?.length) throw new Error('Ingen tilgang til prosjektet');

  return {
    organizationIds: orgIds,
    customerUserIds: (memberships ?? []).map((m) => m.id),
  };
}
