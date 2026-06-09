import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveRequirements } from '@/lib/documents/requirements';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { projectInputFromForm } from '@/lib/projectInput';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import type { DocumentId } from '@/lib/documents/ids';
import type { SaveProjectPayload } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { isArchiveEligibleId } from './eligible';
import { mapDbToArchiveDocument } from './mappers';
import type { DbArchiveRow } from './mappers';
import {
  buildTypesToLink,
  enrichFormForSync,
  matchArchiveRowFromCache,
} from './syncLinks';
import type { AutoLinkResult, ProjectArchiveLink } from './types';

function normalizeTypeId(id: string): string {
  return id.trim().toLowerCase();
}

export async function getCompanyProfileId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function autoLinkArchiveDocuments(
  supabase: SupabaseClient,
  projectId: string,
  companyId: string,
  userId: string,
  payload: SaveProjectPayload
): Promise<AutoLinkResult[]> {
  const db = createAdminClient() ?? supabase;

  const { data: allActiveRows } = await db
    .from('company_archive')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false });

  const activeArchive = (allActiveRows ?? []) as DbArchiveRow[];
  const enrichedPayload = enrichFormForSync(payload, activeArchive);

  const raw = enrichedPayload.selectedDocuments ?? CORE_DOCUMENT_IDS;
  const selectedAi = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
  ) as DocumentId[];
  const selectedHybrid =
    enrichedPayload.selectedHybrid ??
    (raw.filter(
      (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
    ) as DocumentId[]);

  const projectInput = projectInputFromForm(enrichedPayload);
  const required = deriveRequirements(projectInput, selectedAi, selectedHybrid);
  const archiveEligible = required.filter((d) => isArchiveEligibleId(d.id));

  const results: AutoLinkResult[] = [];
  const typesToLink = buildTypesToLink(archiveEligible, activeArchive);

  for (const searchTypeId of typesToLink) {
    const doc = archiveEligible.find((d) => normalizeTypeId(d.id) === searchTypeId);
    const row = matchArchiveRowFromCache(activeArchive, searchTypeId);

    if (!row) {
      results.push({
        documentTypeId: doc?.id ?? searchTypeId,
        status: 'missing',
        archiveDocument: null,
      });
      continue;
    }

    const archiveDoc = mapDbToArchiveDocument(row);

    const { data: existingLink } = await supabase
      .from('project_archive_links')
      .select('id, linked_at, link_status')
      .eq('project_id', projectId)
      .eq('document_type_id', searchTypeId)
      .maybeSingle();

    if (existingLink) {
      const link: ProjectArchiveLink = {
        id: existingLink.id,
        projectId,
        archiveDocumentId: archiveDoc.id,
        documentTypeId: searchTypeId,
        linkStatus: existingLink.link_status as ProjectArchiveLink['linkStatus'],
        linkedAt: existingLink.linked_at,
        label: archiveDoc.label,
        version: archiveDoc.version,
        fileName: archiveDoc.fileName,
        uploadedAt: archiveDoc.uploadedAt,
      };
      results.push({
        documentTypeId: doc?.id ?? searchTypeId,
        status: 'auto_linked',
        archiveDocument: archiveDoc,
        link,
      });
      continue;
    }

    const { data: linkRow, error: linkErr } = await supabase
      .from('project_archive_links')
      .insert({
        project_id: projectId,
        archive_document_id: archiveDoc.id,
        document_type_id: searchTypeId,
        linked_by: userId,
        link_status: 'auto_linked',
      })
      .select('*')
      .single();

    if (linkErr) {
      console.warn('[samsiq autoLink] link insert failed', searchTypeId, linkErr.message);
      results.push({
        documentTypeId: doc?.id ?? searchTypeId,
        status: 'auto_linked',
        archiveDocument: archiveDoc,
        link: {
          projectId,
          archiveDocumentId: archiveDoc.id,
          documentTypeId: searchTypeId,
          linkStatus: 'auto_linked',
          label: archiveDoc.label,
          version: archiveDoc.version,
          fileName: archiveDoc.fileName,
          uploadedAt: archiveDoc.uploadedAt,
        },
      });
      continue;
    }

    const link: ProjectArchiveLink = {
      id: linkRow.id,
      projectId,
      archiveDocumentId: archiveDoc.id,
      documentTypeId: searchTypeId,
      linkStatus: 'auto_linked',
      linkedAt: linkRow.linked_at,
      label: archiveDoc.label,
      version: archiveDoc.version,
      fileName: archiveDoc.fileName,
      uploadedAt: archiveDoc.uploadedAt,
    };

    results.push({
      documentTypeId: doc?.id ?? searchTypeId,
      status: 'auto_linked',
      archiveDocument: archiveDoc,
      link,
    });
  }

  return results;
}

export async function fetchProjectArchiveLinks(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectArchiveLink[]> {
  const { data, error } = await supabase
    .from('project_archive_links')
    .select(
      `
      id,
      project_id,
      archive_document_id,
      document_type_id,
      link_status,
      linked_at,
      company_archive (
        label,
        version,
        file_name,
        uploaded_at,
        is_active
      )
    `
    )
    .eq('project_id', projectId);

  if (error || !data) return [];

  return data
    .filter((row) => {
      const raw = row.company_archive;
      const arch = Array.isArray(raw) ? raw[0] : raw;
      return (arch as { is_active?: boolean } | null)?.is_active !== false;
    })
    .map((row) => {
      const raw = row.company_archive;
      const arch = (Array.isArray(raw) ? raw[0] : raw) as {
        label: string;
        version: string;
        file_name: string;
        uploaded_at: string;
      } | null;
      return {
        id: row.id,
        projectId: row.project_id,
        archiveDocumentId: row.archive_document_id,
        documentTypeId: row.document_type_id,
        linkStatus: row.link_status as ProjectArchiveLink['linkStatus'],
        linkedAt: row.linked_at,
        label: arch?.label,
        version: arch?.version,
        fileName: arch?.file_name,
        uploadedAt: arch?.uploaded_at,
      };
    });
}
