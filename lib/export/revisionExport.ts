import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import { revisionToBlocks } from '@/lib/document-model/revisionToBlocks';
import { parseMachineFields } from '@/lib/generators/machineFields';
import type { StructuredDocumentData } from '@/lib/document-model/types';

export type ExportRevisionData = {
  blocks: ReturnType<typeof revisionToBlocks>;
  meta: {
    title: string;
    project: string;
    machine: string;
    revision: number;
    date: string;
    produsent?: string;
    serienr?: string;
    kunde?: string;
    ingenior?: string;
    documentId?: string;
  };
  filenameBase: string;
};

export async function loadRevisionForExport(
  _userId: string,
  projectId: string,
  documentId: DocumentId
): Promise<ExportRevisionData | { error: string; status: number }> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('prosjekter')
    .select('id, navn, kunde, produsent, ingenior, machine_data')
    .eq('id', projectId)
    .maybeSingle();

  if (!project?.id) {
    return { error: 'Ingen tilgang', status: 403 };
  }

  const db = requireAdminClient();
  const { data: row, error } = await db
    .from('document_revisions')
    .select('*')
    .eq('project_id', projectId)
    .eq('document_id', documentId)
    .order('revision', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return { error: 'Fant ingen revisjon for dokumentet', status: 404 };
  }

  const structuredData = row.structured_data as StructuredDocumentData | null;
  const blocks = revisionToBlocks({
    contentJson: row.content_json,
    structuredData,
    documentId,
    contentHtml: row.content,
  });

  const label = getCatalogDocument(documentId)?.label ?? documentId;
  const date = new Date(row.changed_at).toLocaleDateString('no-NO');
  const machineData = (project as { machine_data?: string }).machine_data ?? '';
  const fields = parseMachineFields(machineData);
  const projectName =
    (project as { navn?: string }).navn ?? fields.prosjekt ?? projectId;

  return {
    blocks,
    meta: {
      title: label,
      project: projectName,
      machine: fields.maskin !== '—' ? fields.maskin : projectName,
      revision: row.revision as number,
      date,
      produsent:
        (project as { produsent?: string }).produsent ?? fields.produsent,
      serienr: fields.serienr,
      kunde: (project as { kunde?: string }).kunde ?? fields.kunde,
      ingenior:
        (project as { ingenior?: string }).ingenior ?? fields.ingenior,
      documentId,
    },
    filenameBase: `${documentId}_rev${row.revision}`,
  };
}
