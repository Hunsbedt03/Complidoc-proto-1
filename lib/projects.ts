import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProsjektSummary } from './types';
import { formatSupabaseError, supabaseErrorFields } from './supabaseError';
import { rebuildZipFromDocs } from './rebuildZip';
import { normalizeDocumentId } from './documents/ids';
import type { GeneratedDoc } from './types';

function throwClientError(step: string, err: unknown, extra?: Record<string, unknown>): never {
  console.error('[samsiq]', step, supabaseErrorFields(err), extra ?? '');
  throw new Error(formatSupabaseError(err));
}

export async function loadProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProsjektSummary[]> {
  const { data, error } = await supabase
    .from('prosjekter')
    .select('id, navn, produsent, status, created_at, zip_filename')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    throwClientError('loadProjects', error, { userId });
  }
  return data || [];
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

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('no-NO');
  } catch {
    return '';
  }
}

export async function getBedriftId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('brukere_bedrifter')
    .select('bedrift_id')
    .eq('user_id', userId)
    .limit(1);
  return data?.[0]?.bedrift_id ?? null;
}
