import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';

function defaultInitialHtml(documentId: string): string {
  const def = getCatalogDocument(documentId as DocumentId);
  const label = def?.label ?? documentId;
  return `<h2>${label}</h2><p>AI-generert dokument. Rediger for å tilpasse før endelig låsing.</p>`;
}

/** Oppretter v1-revisjoner i Supabase ved første prosjektlagring (hvis tabellen finnes). */
export async function seedCloudInitialRevisions(
  supabase: SupabaseClient,
  projectId: string,
  documents: Array<{
    documentId: string;
    contentHtml?: string;
    contentJson?: string;
    language?: 'no' | 'en';
    structuredData?: string;
  }>,
  userId: string,
  changedByName: string
): Promise<number> {
  if (documents.length === 0) return 0;

  const documentIds = documents.map((d) => d.documentId);

  const { data: existingRows } = await supabase
    .from('document_revisions')
    .select('document_id')
    .eq('project_id', projectId)
    .in('document_id', documentIds);

  const existingIds = new Set((existingRows ?? []).map((r) => r.document_id));
  const toInsert = documents.filter((d) => !existingIds.has(d.documentId));

  if (toInsert.length === 0) return 0;

  const rows = toInsert.map((doc) => {
    let parsedJson: unknown = null;
    if (doc.contentJson) {
      try {
        parsedJson = JSON.parse(doc.contentJson);
      } catch {
        parsedJson = null;
      }
    }
    let parsedStructured: unknown = null;
    if (doc.structuredData) {
      try {
        parsedStructured = JSON.parse(doc.structuredData);
      } catch {
        parsedStructured = null;
      }
    }
    const content =
      doc.contentHtml ?? defaultInitialHtml(doc.documentId);
    const language =
      doc.language ??
      (doc.documentId === 'user_manual_en' ? 'en' : 'no');

    return {
      project_id: projectId,
      document_id: doc.documentId,
      revision: 1,
      content,
      content_json: parsedJson,
      language,
      structured_data: parsedStructured,
      change_type: 'initial_generation',
      change_note: 'Automatisk generert ved prosjektopprettelse',
      changed_by: userId,
      changed_by_name: changedByName || 'Samsiq AI',
      source: 'ai_generated',
    };
  });

  const { error } = await supabase.from('document_revisions').insert(rows);
  if (error) return 0;
  return rows.length;
}
