import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { computePackageCompleteness } from '@/lib/documents/completeness';
import { normalizeDocumentId, CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { projectFormFromMachineData } from '@/lib/parseMachineData';
import { projectInputFromForm } from '@/lib/projectInput';
import { hydrateDocumentContents } from '@/lib/revisions/hydrateContents';
import type { GeneratedDoc, UploadSlot } from '@/lib/types';

export type DocumentSnapshotRow = {
  document_id: string;
  label: string;
  filename: string | null;
  content_html: string;
  content_hash: string;
  status: string;
};

function hashContent(html: string): string {
  return createHash('sha256').update(html, 'utf8').digest('hex');
}

/** Lagrer frosset dokumentinnhold for en låst revisjonssyklus. */
export async function snapshotDocumentsForCycle(input: {
  revisionCycleId: string;
  projectId: string;
  documentIds: string[];
  labelsByDocumentId: Record<string, string>;
  filenamesByDocumentId: Record<string, string>;
  statusByDocumentId: Record<string, string>;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const { data: existing } = await admin
    .from('revision_cycle_document_snapshots')
    .select('id')
    .eq('revision_cycle_id', input.revisionCycleId)
    .limit(1);

  if (existing && existing.length > 0) {
    return;
  }

  const contents = await hydrateDocumentContents(input.projectId, input.documentIds);

  const rows = input.documentIds.map((documentId) => {
    const label =
      input.labelsByDocumentId[documentId] ??
      getCatalogDocument(documentId)?.label ??
      documentId;
    const contentHtml = contents[documentId] ?? `<h2>${label}</h2>`;
    return {
      revision_cycle_id: input.revisionCycleId,
      project_id: input.projectId,
      document_id: documentId,
      label,
      filename: input.filenamesByDocumentId[documentId] ?? null,
      content_html: contentHtml,
      content_hash: hashContent(contentHtml),
      status: input.statusByDocumentId[documentId] ?? 'complete',
    };
  });

  if (rows.length === 0) return;

  const { error } = await admin.from('revision_cycle_document_snapshots').insert(rows);
  if (error) throw error;
}

/** Bygger og lagrer snapshot fra live prosjektdata ved låsing. */
export async function snapshotAllProjectDocumentsForCycle(
  revisionCycleId: string,
  projectId: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const { data: project } = await admin
    .from('prosjekter')
    .select('navn, kunde, produsent, ingenior, machine_data')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const formData = projectFormFromMachineData(project.machine_data, {
    prosjekt: project.navn,
    kunde: project.kunde,
    produsent: project.produsent,
    ingenior: project.ingenior,
  });

  const { data: docRows } = await admin
    .from('dokumenter')
    .select('doc_type, filename')
    .eq('prosjekt_id', projectId);

  const generatedDocuments: GeneratedDoc[] = (docRows ?? []).map((d) => ({
    documentId: normalizeDocumentId(d.doc_type),
    docType: d.doc_type,
    filename: d.filename,
    docx: '',
  }));

  const { data: uploadRows } = await admin
    .from('uploaded_documents')
    .select('document_id, file_name')
    .eq('project_id', projectId)
    .eq('is_current', true);

  const uploads: UploadSlot[] = (uploadRows ?? []).map((row) => ({
    documentId: row.document_id,
    status: 'uploaded' as const,
    fileName: row.file_name,
  }));

  const selectedAi = (formData.selectedDocuments?.length
    ? formData.selectedDocuments
    : CORE_DOCUMENT_IDS
  ).filter((id) => getCatalogDocument(id)?.sourceType === 'ai_generated');
  const selectedHybrid = (formData.selectedDocuments ?? []).filter(
    (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
  );

  const completeness = computePackageCompleteness(
    projectInputFromForm(formData),
    selectedAi,
    selectedHybrid,
    generatedDocuments,
    uploads,
    false,
    []
  );

  const labelsByDocumentId: Record<string, string> = {};
  const filenamesByDocumentId: Record<string, string> = {};
  const statusByDocumentId: Record<string, string> = {};

  for (const item of completeness.items) {
    labelsByDocumentId[item.documentId] = item.label;
    filenamesByDocumentId[item.documentId] =
      generatedDocuments.find((d) => d.documentId === item.documentId)?.filename ??
      item.label;
    statusByDocumentId[item.documentId] =
      item.status === 'complete' || item.status === 'uploaded' || item.status === 'template_ready'
        ? 'complete'
        : 'missing';
  }

  await snapshotDocumentsForCycle({
    revisionCycleId,
    projectId,
    documentIds: completeness.items.map((i) => i.documentId),
    labelsByDocumentId,
    filenamesByDocumentId,
    statusByDocumentId,
  });
}

/** Henter snapshot-innhold for kundevisning av en signert/låst syklus. */
export async function loadSnapshotContentsForCycle(
  revisionCycleId: string
): Promise<Record<string, DocumentSnapshotRow> | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from('revision_cycle_document_snapshots')
    .select('document_id, label, filename, content_html, content_hash, status')
    .eq('revision_cycle_id', revisionCycleId);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('revision_cycle_document_snapshots')) {
      return null;
    }
    throw error;
  }

  if (!data?.length) return null;

  const map: Record<string, DocumentSnapshotRow> = {};
  for (const row of data) {
    map[row.document_id] = row as DocumentSnapshotRow;
  }
  return map;
}
