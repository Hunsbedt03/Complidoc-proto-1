import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserPermissions } from '@/lib/team/server';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { invitationId?: string };
    if (!body.invitationId) {
      return NextResponse.json({ error: 'Mangler invitationId' }, { status: 400 });
    }

    const permissions = await getUserPermissions(supabase, user.id);
    if (!permissions?.invite) {
      return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data: inv } = await db
      .from('team_invitations')
      .select('id, company_id')
      .eq('id', body.invitationId)
      .maybeSingle();

    if (!inv || inv.company_id !== permissions.companyId) {
      return NextResponse.json({ error: 'Invitasjon ikke funnet' }, { status: 404 });
    }

    const { error } = await db
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', body.invitationId);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
