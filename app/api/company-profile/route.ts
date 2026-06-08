import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapCompanyProfileToDb,
  mapDbToCompanyProfile,
  validateCompanyProfile,
} from '@/lib/companyProfile';
import { formatSupabaseError } from '@/lib/supabaseError';
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

    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      const msg = formatSupabaseError(error);
      if (msg.includes('company_profiles') || msg.includes('42P01')) {
        return NextResponse.json({ profile: null, setupRequired: true });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      profile: data ? mapDbToCompanyProfile(data) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
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

    const row = {
      ...mapCompanyProfileToDb(user.id, body.profile),
      updated_at: new Date().toISOString(),
    };

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data, error } = await db
      .from('company_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    return NextResponse.json({ profile: mapDbToCompanyProfile(data) });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
