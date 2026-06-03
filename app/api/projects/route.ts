import { NextResponse } from 'next/server';
import { agentDebugLog } from '@/lib/debugLog';
import { loadProjects } from '@/lib/projects';
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

    const projects = await loadProjects(supabase, user.id);
    agentDebugLog(
      'app/api/projects/route.ts:GET',
      'projects loaded',
      { userId: user.id, count: projects.length },
      'H-API'
    );
    return NextResponse.json({ projects });
  } catch (err) {
    const message = formatSupabaseError(err);
    console.error('[samsiq] GET /api/projects:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
