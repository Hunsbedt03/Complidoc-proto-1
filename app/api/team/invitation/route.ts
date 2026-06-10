import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLE_LABELS, type TeamRole } from '@/lib/auth/permissions';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Mangler token' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Server ikke konfigurert' }, { status: 500 });
    }

    const { data: invitation, error } = await admin
      .from('team_invitations')
      .select('email, role, expires_at, status, company_id, invited_by')
      .eq('token', token)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitasjon ikke funnet' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitasjonen er ikke lenger gyldig' }, { status: 400 });
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invitasjonen har utløpt' }, { status: 400 });
    }

    const { data: company } = await admin
      .from('company_profiles')
      .select('company_name')
      .eq('id', invitation.company_id)
      .maybeSingle();

    let inviterName = 'En kollega';
    if (invitation.invited_by) {
      const { data: inviter } = await admin
        .from('users')
        .select('full_name, email')
        .eq('id', invitation.invited_by)
        .maybeSingle();
      inviterName = inviter?.full_name || inviter?.email || inviterName;
    }

    return NextResponse.json({
      preview: {
        companyName: company?.company_name ?? 'Bedrift',
        role: invitation.role as TeamRole,
        roleLabel: ROLE_LABELS[invitation.role as TeamRole],
        inviterName,
        expiresAt: invitation.expires_at,
        email: invitation.email,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
