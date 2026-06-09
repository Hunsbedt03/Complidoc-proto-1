import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveRequirements } from '@/lib/documents/requirements';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { projectInputFromForm } from '@/lib/projectInput';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import type { DocumentId } from '@/lib/documents/ids';
import type { ISOCertification } from '@/lib/documents/types';
import type { ProjectFormData, ProjectArchiveLink } from '@/lib/types';
import { isArchiveEligibleId } from './eligible';
import { getCompanyProfileId } from './autoLink';
import { mapDbToArchiveDocument } from './mappers';
import type { DbArchiveRow } from './mappers';

export type ArchiveSearchDetail = {
  documentTypeId: string;
  companyId: string;
  found: boolean;
  matchedRowId?: string;
  matchedDbTypeId?: string;
  allActiveTypeIds: string[];
};

export const QUALITY_MANUAL_TYPE_ID = 'quality_manual';

export type ArchiveSyncDebug = {
  companyProfileId: string | null;
  projectInCloud: boolean;
  certificationsInForm: string[];
  certificationsUsed: string[];
  eligibleTypeIds: string[];
  archiveFirstTypeIds: string[];
  codeSearchForQualityManual: string;
  archiveRowsFound: Record<string, boolean>;
  searchDetails: ArchiveSearchDetail[];
  linksCreated: number;
  linksReused: number;
  errors: string[];
  usedAdminClient: boolean;
};

export function buildTypesToLink(
  eligible: { id: string }[],
  activeArchive: DbArchiveRow[]
): string[] {
  const set = new Set<string>();
  for (const doc of eligible) set.add(normalizeTypeId(doc.id));
  for (const row of activeArchive) {
    const typeId = normalizeTypeId(row.document_type_id);
    if (isArchiveEligibleId(typeId)) set.add(typeId);
  }
  return [...set];
}

function activeCertifications(certs?: ISOCertification[]): ISOCertification[] {
  return (certs ?? []).filter((c) => c !== 'none');
}

function inferCertificationsFromArchive(
  rows: DbArchiveRow[]
): ISOCertification[] {
  const set = new Set<ISOCertification>();
  for (const row of rows) {
    for (const iso of row.iso_certifications ?? []) {
      if (iso && iso !== 'none') set.add(iso as ISOCertification);
    }
    const catalog = getCatalogDocument(row.document_type_id as DocumentId);
    if (catalog?.isoScope) {
      for (const iso of catalog.isoScope) set.add(iso);
    }
  }
  return [...set];
}

/** Utvider form med sertifiseringer inferert fra arkiv når prosjekt mangler dem. */
export function enrichFormForSync(
  form: ProjectFormData,
  archiveRows: DbArchiveRow[]
): ProjectFormData {
  if (activeCertifications(form.certifications).length) return form;
  const inferred = inferCertificationsFromArchive(archiveRows);
  if (!inferred.length) return form;
  return { ...form, certifications: inferred };
}

export function matchArchiveRowFromCache(
  activeArchive: DbArchiveRow[],
  documentTypeId: string
): DbArchiveRow | null {
  const typeId = normalizeTypeId(documentTypeId);
  return (
    activeArchive.find(
      (row) => normalizeTypeId(row.document_type_id) === typeId
    ) ?? null
  );
}

function normalizeTypeId(id: string): string {
  return id.trim().toLowerCase();
}

export async function findActiveArchiveDoc(
  db: SupabaseClient,
  companyId: string,
  documentTypeId: string,
  cachedActiveRows?: DbArchiveRow[]
): Promise<{ row: DbArchiveRow | null; detail: ArchiveSearchDetail }> {
  const typeId = normalizeTypeId(documentTypeId);

  const { data: exact, error: exactErr } = await db
    .from('company_archive')
    .select('*')
    .eq('company_id', companyId)
    .eq('document_type_id', typeId)
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false })
    .limit(1);

  if (exactErr) throw exactErr;
  if (exact?.[0]) {
    const row = exact[0] as DbArchiveRow;
    return {
      row,
      detail: {
        documentTypeId: typeId,
        companyId,
        found: true,
        matchedRowId: row.id,
        matchedDbTypeId: row.document_type_id,
        allActiveTypeIds: [],
      },
    };
  }

  const all =
    cachedActiveRows ??
    (
      await db
        .from('company_archive')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false })
    ).data;

  const activeRows = (all ?? []) as DbArchiveRow[];
  const match = activeRows.find(
    (row) => normalizeTypeId(row.document_type_id) === typeId
  );

  return {
    row: match ?? null,
    detail: {
      documentTypeId: typeId,
      companyId,
      found: Boolean(match),
      matchedRowId: match?.id,
      matchedDbTypeId: match?.document_type_id,
      allActiveTypeIds: activeRows.map((r) => r.document_type_id),
    },
  };
}

export function formToPayload(form: ProjectFormData) {
  const raw = form.selectedDocuments ?? CORE_DOCUMENT_IDS;
  const selectedAi = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
  ) as DocumentId[];
  const selectedHybrid =
    form.selectedHybrid ??
    (raw.filter(
      (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
    ) as DocumentId[]);
  return { selectedAi, selectedHybrid };
}

/**
 * Synkroniserer arkivdokumenter mot company_archive for et prosjekt.
 * Kjøres ved lagring OG ved åpning av eksisterende prosjekter.
 */
export async function syncProjectArchiveLinks(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  form: ProjectFormData,
  options?: { admin?: SupabaseClient | null }
): Promise<{ links: ProjectArchiveLink[]; debug: ArchiveSyncDebug }> {
  const debug: ArchiveSyncDebug = {
    companyProfileId: null,
    projectInCloud: false,
    certificationsInForm: [],
    certificationsUsed: [],
    eligibleTypeIds: [],
    archiveFirstTypeIds: [],
    codeSearchForQualityManual: QUALITY_MANUAL_TYPE_ID,
    archiveRowsFound: {},
    searchDetails: [],
    linksCreated: 0,
    linksReused: 0,
    errors: [],
    usedAdminClient: Boolean(options?.admin),
  };

  const companyId = await getCompanyProfileId(supabase, userId);
  debug.companyProfileId = companyId;
  if (!companyId) {
    return { links: [], debug };
  }

  const db = options?.admin ?? supabase;
  debug.certificationsInForm = activeCertifications(form.certifications);

  const { data: allActiveRows, error: listErr } = await db
    .from('company_archive')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false });

  if (listErr) {
    debug.errors.push(`list: ${listErr.message}`);
  }

  const activeArchive = (allActiveRows ?? []) as DbArchiveRow[];
  const enrichedForm = enrichFormForSync(form, activeArchive);
  debug.certificationsUsed = activeCertifications(enrichedForm.certifications);

  const projectInput = projectInputFromForm(enrichedForm);
  const { selectedAi, selectedHybrid } = formToPayload(enrichedForm);

  const eligible = deriveRequirements(projectInput, selectedAi, selectedHybrid)
    .filter((d) => isArchiveEligibleId(d.id));
  debug.eligibleTypeIds = eligible.map((d) => d.id);

  const { data: cloudProject } = await supabase
    .from('prosjekter')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  debug.projectInCloud = Boolean(cloudProject?.id);

  const links: ProjectArchiveLink[] = [];
  const typesToLink = buildTypesToLink(eligible, activeArchive);
  debug.archiveFirstTypeIds = typesToLink;

  for (const typeId of typesToLink) {
    try {
      const cachedRow = matchArchiveRowFromCache(activeArchive, typeId);
      const { row, detail } = cachedRow
        ? {
            row: cachedRow,
            detail: {
              documentTypeId: typeId,
              companyId,
              found: true,
              matchedRowId: cachedRow.id,
              matchedDbTypeId: cachedRow.document_type_id,
              allActiveTypeIds: activeArchive.map((r) => r.document_type_id),
            },
          }
        : await findActiveArchiveDoc(db, companyId, typeId, activeArchive);

      debug.searchDetails.push(detail);
      debug.archiveRowsFound[typeId] = Boolean(row);

      if (!row) continue;

      const archiveDoc = mapDbToArchiveDocument(row);

      if (debug.projectInCloud) {
        const { data: existingLink } = await supabase
          .from('project_archive_links')
          .select('id, link_status, linked_at')
          .eq('project_id', projectId)
          .eq('document_type_id', typeId)
          .maybeSingle();

        if (existingLink) {
          debug.linksReused += 1;
          links.push({
            id: existingLink.id,
            projectId,
            archiveDocumentId: archiveDoc.id,
            documentTypeId: typeId,
            linkStatus: existingLink.link_status as ProjectArchiveLink['linkStatus'],
            linkedAt: existingLink.linked_at,
            label: archiveDoc.label,
            version: archiveDoc.version,
            fileName: archiveDoc.fileName,
            uploadedAt: archiveDoc.uploadedAt,
          });
          continue;
        }

        const { data: linkRow, error: linkErr } = await supabase
          .from('project_archive_links')
          .insert({
            project_id: projectId,
            archive_document_id: archiveDoc.id,
            document_type_id: typeId,
            linked_by: userId,
            link_status: 'auto_linked',
          })
          .select('*')
          .single();

        if (linkErr) {
          debug.errors.push(`${typeId}: ${linkErr.message}`);
          // Still expose virtual link so UI works
          links.push({
            projectId,
            archiveDocumentId: archiveDoc.id,
            documentTypeId: typeId,
            linkStatus: 'auto_linked',
            label: archiveDoc.label,
            version: archiveDoc.version,
            fileName: archiveDoc.fileName,
            uploadedAt: archiveDoc.uploadedAt,
          });
          continue;
        }

        debug.linksCreated += 1;
        links.push({
          id: linkRow.id,
          projectId,
          archiveDocumentId: archiveDoc.id,
          documentTypeId: typeId,
          linkStatus: 'auto_linked',
          linkedAt: linkRow.linked_at,
          label: archiveDoc.label,
          version: archiveDoc.version,
          fileName: archiveDoc.fileName,
          uploadedAt: archiveDoc.uploadedAt,
        });
      } else {
        // Lokalt prosjekt — virtuell kobling uten DB-rad
        links.push({
          projectId,
          archiveDocumentId: archiveDoc.id,
          documentTypeId: typeId,
          linkStatus: 'auto_linked',
          label: archiveDoc.label,
          version: archiveDoc.version,
          fileName: archiveDoc.fileName,
          uploadedAt: archiveDoc.uploadedAt,
        });
      }
    } catch (err) {
      debug.errors.push(
        `${typeId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { links, debug };
}
