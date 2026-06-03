import { NextResponse } from 'next/server';
import { upsertUserProfileAdmin } from '@/lib/upsertUserProfileAdmin';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const usedAdmin = await upsertUserProfileAdmin(user);
    if (!usedAdmin) {
      return NextResponse.json({ ok: false, reason: 'no_service_role' });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = formatSupabaseError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
