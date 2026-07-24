import { NextResponse } from 'next/server';
import { fetchCommandCenter } from '@/lib/customer-portal/commandCenter';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

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

    const data = await fetchCommandCenter(supabase, user.id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
