import { NextResponse } from 'next/server';
import { agentDebugLog } from '@/lib/debugLog';
import { loadProjects } from '@/lib/projects';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let count = 0;
  let loadError: string | null = null;

  if (user) {
    try {
      const projects = await loadProjects(supabase, user.id);
      count = projects.length;
    } catch (err) {
      loadError = formatSupabaseError(err);
    }
  }

  const payload = {
    hasUser: !!user,
    email: user?.email ?? null,
    userId: user?.id ?? null,
    count,
    authError: authError ? formatSupabaseError(authError) : null,
    loadError,
  };

  agentDebugLog(
    'app/api/debug/dashboard-probe/route.ts',
    'dashboard probe',
    payload,
    'H-probe'
  );

  return NextResponse.json(payload);
}
