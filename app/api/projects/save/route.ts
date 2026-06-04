import { NextResponse } from 'next/server';
import { debugSessionLogServer } from '@/lib/debugSessionLog.server';
import { saveGeneratedProject, ensureUserProfile } from '@/lib/projects-save';
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

    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as {
      bedriftId: string | null;
      payload: SaveProjectPayload;
    };

    debugSessionLogServer({
      hypothesisId: 'H-payload',
      runId: 'post-fix-4',
      location: 'api/projects/save/route.ts',
      message: 'save request size',
      data: {
        bytes: rawBody.length,
        docCount: body.payload.documents?.length ?? 0,
      },
    });

    const usedAdmin = await upsertUserProfileAdmin(user);
    if (!usedAdmin) {
      await ensureUserProfile(supabase, user.id);
    }

    const saveResult = await saveGeneratedProject(
      supabase,
      user.id,
      body.bedriftId,
      body.payload,
      { skipProfileEnsure: true }
    );

    debugSessionLogServer({
      hypothesisId: 'H-save',
      runId: 'post-fix-4',
      location: 'api/projects/save/route.ts',
      message: 'save ok',
      data: saveResult,
    });

    const { projectId, skippedDocumentTypes } = saveResult;

    return NextResponse.json({
      projectId,
      skippedDocumentTypes,
      partialDocumentSave: skippedDocumentTypes.length > 0,
    });
  } catch (err) {
    const message = formatSupabaseError(err);
    debugSessionLogServer({
      hypothesisId: 'H-save',
      runId: 'post-fix-4',
      location: 'api/projects/save/route.ts',
      message: 'save failed',
      data: { error: message },
    });
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
