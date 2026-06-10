import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapCompanyProfileToDb,
  mapDbToCompanyProfile,
  validateCompanyProfile,
} from '@/lib/companyProfile';
import { formatSupabaseError } from '@/lib/supabaseError';
import {
  bootstrapTeamForUser,
  ensureOwnerTeamMember,
  getUserPermissions,
  resolveCompanyProfileId,
} from '@/lib/team/server';
import type { CompanyProfile } from '@/lib/types';

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

    const companyId = await resolveCompanyProfileId(supabase, user.id);
    const query = companyId
      ? supabase.from('company_profiles').select('*').eq('id', companyId)
      : supabase.from('company_profiles').select('*').eq('user_id', user.id);

    const { data, error } = await query.maybeSingle();

    if (error) {
      const msg = formatSupabaseError(error);
      if (
        msg.includes('company_profiles') ||
        msg.includes('team_members') ||
        msg.includes('42P01')
      ) {
        return NextResponse.json({ profile: null, setupRequired: true });
      }
      console.warn('[samsiq company-profile] GET:', msg);
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: data ? mapDbToCompanyProfile(data) : null,
    });
  } catch (err) {
    console.warn('[samsiq company-profile] GET:', formatSupabaseError(err));
    return NextResponse.json({ profile: null });
  }
}

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

    const body = (await request.json()) as {
      profile?: CompanyProfile;
      skipValidation?: boolean;
    };

    if (!body.profile) {
      return NextResponse.json({ error: 'Mangler profil' }, { status: 400 });
    }

    const validationError = validateCompanyProfile(
      body.profile,
      !body.skipValidation
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const permissions = await getUserPermissions(supabase, user.id);
    const companyId = await resolveCompanyProfileId(supabase, user.id);

    if (companyId && !permissions?.editProfile) {
      return NextResponse.json({ error: 'Ikke tilgang til å redigere profil' }, { status: 403 });
    }

    const row = {
      ...mapCompanyProfileToDb(user.id, body.profile),
      updated_at: new Date().toISOString(),
    };

    const admin = createAdminClient();
    const db = admin ?? supabase;

    let data;
    let error;

    if (companyId) {
      const { user_id: _ownerId, ...sharedFields } = row;
      const result = await db
        .from('company_profiles')
        .update(sharedFields)
        .eq('id', companyId)
        .select('*')
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await db
        .from('company_profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    if (data?.id) {
      await ensureOwnerTeamMember(db, user.id, data.id);
    }

    return NextResponse.json({ profile: mapDbToCompanyProfile(data) });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
