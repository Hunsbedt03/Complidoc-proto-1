import { NextResponse } from 'next/server';
import { fetchProjectArchiveLinks } from '@/lib/archive/autoLink';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ links: [] });
    }

    const links = await fetchProjectArchiveLinks(supabase, projectId);
    return NextResponse.json({ links });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
