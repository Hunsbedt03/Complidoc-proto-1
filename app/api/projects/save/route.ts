import { NextResponse } from 'next/server';
import { saveGeneratedProject, ensureUserProfile } from '@/lib/projects';
import { formatSupabaseError } from '@/lib/supabaseError';
import { upsertUserProfileAdmin } from '@/lib/upsertUserProfileAdmin';
import { createClient } from '@/lib/supabase/server';
import type { SaveProjectPayload } from '@/lib/types';

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
      bedriftId: string | null;
      payload: SaveProjectPayload;
    };

    const usedAdmin = await upsertUserProfileAdmin(user);
    if (!usedAdmin) {
      await ensureUserProfile(supabase, user.id);
    }

    const projectId = await saveGeneratedProject(
      supabase,
      user.id,
      body.bedriftId,
      body.payload,
      { skipProfileEnsure: true }
    );

    return NextResponse.json({ projectId });
  } catch (err) {
    const message = formatSupabaseError(err);
    const needsSetup =
      message.includes('patch-ensure-user-profile') ||
      message.includes('42501') ||
      message.includes('PGRST202') ||
      message.includes('ensure_user_profile') ||
      message.includes('Database mangler oppsett') ||
      message.includes('brukerprofiler');
    return NextResponse.json(
      {
        setupRequired: needsSetup,
        error: needsSetup
          ? message +
            ' Alternativt: legg SUPABASE_SERVICE_ROLE_KEY i .env.local (Supabase → Project Settings → API).'
          : message,
      },
      { status: needsSetup ? 503 : 500 }
    );
  }
}
