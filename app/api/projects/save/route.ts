import { NextResponse } from 'next/server';
import {
  autoLinkArchiveDocuments,
  getCompanyProfileId,
} from '@/lib/archive/autoLink';
import type { AutoLinkResult } from '@/lib/archive/types';
import { isArchiveEligibleId } from '@/lib/archive/eligible';
import { deriveRequirements } from '@/lib/documents/requirements';
import { projectInputFromForm } from '@/lib/projectInput';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import type { DocumentId } from '@/lib/documents/ids';
import { getLocalCompanyId } from '@/lib/localArchive';
import { seedCloudInitialRevisions } from '@/lib/revisions/server';
import { saveGeneratedProject, ensureUserProfile } from '@/lib/projects-save';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
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
      payload: SaveProjectPayload;
    };

    const usedAdmin = await upsertUserProfileAdmin(user);
    if (!usedAdmin) {
      await ensureUserProfile(supabase, user.id);
    }

    const db = requireAdminClient();

    const saveResult = await saveGeneratedProject(
      db,
      user.id,
      body.payload,
      { skipProfileEnsure: true }
    );

    const { projectId, skippedDocumentTypes } = saveResult;

    void seedCloudInitialRevisions(
      db,
      projectId,
      body.payload.documents.map((d) => ({
        documentId: d.documentId,
        contentHtml: d.contentHtml,
        contentJson: d.contentJson,
        language: d.language,
        structuredData: d.structuredData,
      })),
      user.id,
      body.payload.ingenior || 'Samsiq'
    ).catch((err) => {
      console.warn('[samsiq] seedCloudInitialRevisions', err);
    });

    let archiveLinks: AutoLinkResult[] = [];

    const companyId = await getCompanyProfileId(supabase, user.id);
    if (companyId) {
      try {
        archiveLinks = await autoLinkArchiveDocuments(
          supabase,
          projectId,
          companyId,
          user.id,
          body.payload
        );
      } catch (linkErr) {
        console.warn('[samsiq] autoLinkArchiveDocuments', linkErr);
      }
    }

    const projectInput = projectInputFromForm(body.payload);
    const selectedAi = (body.payload.selectedDocuments ?? CORE_DOCUMENT_IDS) as DocumentId[];
    const required = deriveRequirements(
      projectInput,
      selectedAi,
      body.payload.selectedHybrid ?? []
    );
    const eligibleTypeIds = required
      .filter((d) => isArchiveEligibleId(d.id))
      .map((d) => d.id);

    return NextResponse.json({
      projectId,
      skippedDocumentTypes,
      partialDocumentSave: skippedDocumentTypes.length > 0,
      archiveLinks,
      localArchiveEligibleIds: eligibleTypeIds,
      localCompanyId: getLocalCompanyId(user.id),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : formatSupabaseError(err);
    if (message.includes('Mangler bedriftsprofil')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
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
