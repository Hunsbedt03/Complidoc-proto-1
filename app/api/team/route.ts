import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import {
  bootstrapTeamForUser,
  getUserPermissions,
  checkTeamLimit,
  listPendingInvitations,
  listTeamMembers,
  resolveCompanyProfileId,
  touchMemberActivity,
} from '@/lib/team/server';
import { DEFAULT_OWNER_PERMISSIONS } from '@/lib/auth/permissions';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const admin = createAdminClient();
    if (admin) {
      await bootstrapTeamForUser(admin, user.id);
    }

    const db = requireAdminClient();
    const permissions =
      (await getUserPermissions(supabase, user.id)) ?? DEFAULT_OWNER_PERMISSIONS;
    const companyId =
      permissions.companyId ?? (await resolveCompanyProfileId(supabase, user.id));

    if (!companyId) {
      return NextResponse.json({
        members: [],
        invitations: [],
        permissions,
        teamLimit: null,
      });
    }

    void touchMemberActivity(supabase, user.id);

    const [members, invitations, teamLimit] = await Promise.all([
      listTeamMembers(db, companyId),
      listPendingInvitations(db, companyId),
      checkTeamLimit(db, companyId),
    ]);

    return NextResponse.json({
      members,
      invitations,
      permissions,
      teamLimit,
      companyId,
    });
  } catch (err) {
    console.warn('[samsiq team] GET:', formatSupabaseError(err));
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
