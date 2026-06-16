import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import { formatSupabaseError } from '@/lib/supabaseError';

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

    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Mangler token' }, { status: 400 });
    }

    const db = requireAdminClient();

    const { data: invitation, error: invErr } = await db
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invErr || !invitation) {
      return NextResponse.json(
        { error: 'Ugyldig eller utløpt invitasjon' },
        { status: 400 }
      );
    }

    const userEmail = (user.email ?? '').toLowerCase();
    if (userEmail !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Invitasjonen er sendt til ${invitation.email}. Logg inn med den e-postadressen.`,
        },
        { status: 403 }
      );
    }

    const { data: existing } = await db
      .from('team_members')
      .select('id, status')
      .eq('company_id', invitation.company_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      const { error: memberErr } = await db.from('team_members').insert({
        company_id: invitation.company_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        accepted_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        status: 'active',
      });
      if (memberErr) {
        return NextResponse.json(
          { error: formatSupabaseError(memberErr) },
          { status: 500 }
        );
      }
    } else if (existing.status !== 'active') {
      await db
        .from('team_members')
        .update({
          status: 'active',
          role: invitation.role,
          accepted_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    await db
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    await db
      .from('users')
      .update({ company_id: invitation.company_id })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      companyId: invitation.company_id,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
