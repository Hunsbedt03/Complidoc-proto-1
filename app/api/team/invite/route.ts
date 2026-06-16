import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import type { TeamRole } from '@/lib/auth/permissions';
import {
  checkTeamLimit,
  getUserPermissions,
  mapInvitation,
  resolveCompanyProfileId,
} from '@/lib/team/server';
import { sendInvitationEmail } from '@/lib/team/sendInvitationEmail';
import { formatSupabaseError } from '@/lib/supabaseError';

const INVITE_ROLES: TeamRole[] = ['admin', 'engineer', 'viewer'];

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { email?: string; role?: TeamRole };
    const email = body.email?.trim().toLowerCase();
    const role = body.role ?? 'engineer';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-post' }, { status: 400 });
    }

    if (!INVITE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Ugyldig rolle' }, { status: 400 });
    }

    const permissions = await getUserPermissions(supabase, user.id);
    if (!permissions?.invite) {
      return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
    }

    const companyId =
      permissions.companyId ?? (await resolveCompanyProfileId(supabase, user.id));
    if (!companyId) {
      return NextResponse.json({ error: 'Mangler bedriftsprofil' }, { status: 400 });
    }

    const db = requireAdminClient();

    const limitCheck = await checkTeamLimit(db, companyId);
    if (!limitCheck.allowed) {
      const planLabel = limitCheck.plan === 'pro' ? 'Pro' : 'Starter';
      return NextResponse.json(
        {
          error: `Du har nådd grensen på ${limitCheck.limit} brukere for ${planLabel}-planen. Oppgrader for å invitere flere.`,
          teamLimit: limitCheck,
        },
        { status: 403 }
      );
    }

    const { data: profileRow } = await db
      .from('company_profiles')
      .select('company_name')
      .eq('id', companyId)
      .maybeSingle();

    const { data: inviter } = await db
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const { data: invitation, error } = await db
      .from('team_invitations')
      .insert({
        company_id: companyId,
        email,
        role,
        invited_by: user.id,
      })
      .select('*')
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://samsiq.no';
    const invitationUrl = `${appUrl.replace(/\/$/, '')}/invite/${invitation.token}`;

    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: inviter?.full_name || inviter?.email || 'En kollega',
      companyName: profileRow?.company_name ?? 'din bedrift',
      invitationUrl,
      role,
      expiresAt: invitation.expires_at,
    });

    return NextResponse.json({
      success: true,
      invitation: mapInvitation(invitation),
      invitationUrl,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason ?? null,
      resendStatus: emailResult.resendStatus ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
