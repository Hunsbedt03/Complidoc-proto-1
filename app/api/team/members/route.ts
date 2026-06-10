import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TeamRole } from '@/lib/auth/permissions';
import { getUserPermissions } from '@/lib/team/server';
import { formatSupabaseError } from '@/lib/supabaseError';

const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'engineer', 'viewer'];

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { memberId?: string; role?: TeamRole };
    if (!body.memberId || !body.role || !ASSIGNABLE_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
    }

    const permissions = await getUserPermissions(supabase, user.id);
    if (!permissions?.remove) {
      return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data: target } = await db
      .from('team_members')
      .select('id, role, company_id')
      .eq('id', body.memberId)
      .maybeSingle();

    if (!target || target.company_id !== permissions.companyId) {
      return NextResponse.json({ error: 'Medlem ikke funnet' }, { status: 404 });
    }

    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Eier-rollen kan ikke endres' }, { status: 400 });
    }

    const { error } = await db
      .from('team_members')
      .update({ role: body.role })
      .eq('id', body.memberId);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

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

    const body = (await request.json()) as { memberId?: string };
    if (!body.memberId) {
      return NextResponse.json({ error: 'Mangler memberId' }, { status: 400 });
    }

    const permissions = await getUserPermissions(supabase, user.id);
    if (!permissions?.remove) {
      return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data: target } = await db
      .from('team_members')
      .select('id, role, company_id, user_id')
      .eq('id', body.memberId)
      .maybeSingle();

    if (!target || target.company_id !== permissions.companyId) {
      return NextResponse.json({ error: 'Medlem ikke funnet' }, { status: 404 });
    }

    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Eier kan ikke fjernes' }, { status: 400 });
    }

    if (target.user_id === user.id) {
      return NextResponse.json({ error: 'Du kan ikke fjerne deg selv' }, { status: 400 });
    }

    const { error } = await db
      .from('team_members')
      .update({ status: 'deactivated' })
      .eq('id', body.memberId);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    await db
      .from('users')
      .update({ company_id: null })
      .eq('id', target.user_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
