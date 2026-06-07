import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { incrementProjectCount } from '@/lib/auth/subscription';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await incrementProjectCount(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
