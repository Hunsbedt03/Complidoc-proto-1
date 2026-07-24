import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProsjektSummary, ProjectFormData, UploadSlot } from './types';
import { formatSupabaseError, supabaseErrorFields } from './supabaseError';
import { rebuildZipFromDocs } from './rebuildZip';
import { normalizeDocumentId } from './documents/ids';
import type { GeneratedDoc } from './types';
import { projectFormFromMachineData } from './parseMachineData';
import { parseWorkflowStatus, type ProjectStatus } from './projectStatus';

function throwClientError(step: string, err: unknown, extra?: Record<string, unknown>): never {
  console.error('[samsiq]', step, supabaseErrorFields(err), extra ?? '');
  throw new Error(formatSupabaseError(err));
}

export async function loadProjects(
  supabase: SupabaseClient,
  _userId: string
): Promise<ProsjektSummary[]> {
  const { data, error } = await supabase
    .from('prosjekter')
    .select('id, navn, produsent, status, created_at, zip_filename, workflow_status')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    const msg = formatSupabaseError(error);
    if (msg.includes('workflow_status') || msg.includes('42703')) {
      const { data: fallback, error: fbErr } = await supabase
        .from('prosjekter')
        .select('id, navn, produsent, status, created_at, zip_filename')
        .order('created_at', { ascending: false })
        .limit(20);
      if (fbErr) throwClientError('loadProjects', fbErr, { userId: _userId });
      return fallback || [];
    }
    throwClientError('loadProjects', error, { userId: _userId });
  }
  return (data || []).map((row) => ({
    ...row,
    workflowStatus: parseWorkflowStatus(
      (row as { workflow_status?: string }).workflow_status
    ),
  }));
}

export async function loadProjectZip(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ title: string; zip: string; filename: string } | null> {
  const { data: prosjekt, error } = await supabase
    .from('prosjekter')
    .select('navn, zip_base64, zip_filename')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (error || !prosjekt) return null;

  const title = prosjekt.navn || 'Prosjekt';
  const filename = prosjekt.zip_filename || 'Samsiq.zip';

  if (prosjekt.zip_base64) {
    return { title, zip: prosjekt.zip_base64, filename };
  }

  const { data: docs, error: dErr } = await supabase
    .from('dokumenter')
    .select('doc_type, filename, docx_base64')
    .eq('prosjekt_id', projectId)
    .eq('user_id', userId);
  if (dErr || !docs?.length) return null;

  const documents: GeneratedDoc[] = docs.map((d) => {
    const documentId = normalizeDocumentId(d.doc_type);
    return {
      documentId,
      docType: d.doc_type,
      filename: d.filename,
      docx: d.docx_base64,
    };
  });
  const zipData = await rebuildZipFromDocs(documents, filename);
  return { title, zip: zipData.zip, filename: zipData.filename };
}

export type LoadedProjectSession = {
  title: string;
  zip: string;
  filename: string;
  projectId: string;
  form: ProjectFormData;
  documents: GeneratedDoc[];
  uploads: UploadSlot[];
  workflowStatus: ProjectStatus;
};

/** Last prosjekt med maskindata og dokumenter for prosjektsiden (/app/output). */
export async function loadProjectSession(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<LoadedProjectSession | null> {
  const { data: prosjekt, error } = await supabase
    .from('prosjekter')
    .select(
      'navn, kunde, produsent, ingenior, machine_data, zip_base64, zip_filename, workflow_status'
    )
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (error || !prosjekt) return null;

  const title = prosjekt.navn || 'Prosjekt';
  const filename = prosjekt.zip_filename || 'Samsiq.zip';
  const form = projectFormFromMachineData(prosjekt.machine_data, {
    prosjekt: title,
    kunde: prosjekt.kunde,
    produsent: prosjekt.produsent,
    ingenior: prosjekt.ingenior,
  });

  const { data: docs, error: dErr } = await supabase
    .from('dokumenter')
    .select('doc_type, filename, docx_base64')
    .eq('prosjekt_id', projectId)
    .eq('user_id', userId);
  if (dErr || !docs?.length) return null;

  const documents: GeneratedDoc[] = docs.map((d) => {
    const documentId = normalizeDocumentId(d.doc_type);
    return {
      documentId,
      docType: d.doc_type,
      filename: d.filename,
      docx: d.docx_base64,
    };
  });

  let zip: string;
  if (prosjekt.zip_base64) {
    zip = prosjekt.zip_base64;
  } else {
    const zipData = await rebuildZipFromDocs(documents, filename);
    zip = zipData.zip;
  }

  const uploads: UploadSlot[] = [];
  const { data: uploadRows, error: uploadErr } = await supabase
    .from('uploaded_documents')
    .select('id, document_id, file_name, file_path, file_size, mime_type, uploaded_at')
    .eq('project_id', projectId)
    .eq('is_current', true);

  if (!uploadErr && uploadRows?.length) {
    for (const row of uploadRows) {
      uploads.push({
        documentId: row.document_id,
        status: 'uploaded',
        fileName: row.file_name,
        uploadedAt: row.uploaded_at,
        fileSize: row.file_size ?? undefined,
        filePath: row.file_path,
        storageRecordId: row.id,
        mimeType: row.mime_type ?? undefined,
      });
    }
  }

  return {
    title,
    zip,
    filename,
    projectId,
    form,
    documents,
    uploads,
    workflowStatus: parseWorkflowStatus(
      (prosjekt as { workflow_status?: string }).workflow_status
    ),
  };
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('no-NO');
  } catch {
    return '';
  }
}
