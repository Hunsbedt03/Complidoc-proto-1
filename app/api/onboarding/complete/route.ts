import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import { formatSupabaseError } from '@/lib/supabaseError';

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

    const db = requireAdminClient();

    const { error } = await db
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (error) {
      const msg = formatSupabaseError(error);
      if (msg.includes('onboarding_completed') || msg.includes('42703')) {
        return NextResponse.json(
          {
            error: 'Kjør supabase/patch-onboarding.sql i Supabase',
            setupRequired: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
