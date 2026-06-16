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
  documentIds: string[],
  userId: string,
  changedByName: string
): Promise<number> {
  if (documentIds.length === 0) return 0;

  const { data: existingRows } = await supabase
    .from('document_revisions')
    .select('document_id')
    .eq('project_id', projectId)
    .in('document_id', documentIds);

  const existingIds = new Set((existingRows ?? []).map((r) => r.document_id));
  const toInsert = documentIds.filter((id) => !existingIds.has(id));

  if (toInsert.length === 0) return 0;

  const rows = toInsert.map((documentId) => ({
    project_id: projectId,
    document_id: documentId,
    revision: 1,
    content: defaultInitialHtml(documentId),
    content_json: null,
    change_type: 'initial_generation',
    change_note: 'Automatisk generert ved prosjektopprettelse',
    changed_by: userId,
    changed_by_name: changedByName || 'Samsiq AI',
    source: 'ai_generated',
  }));

  const { error } = await supabase.from('document_revisions').insert(rows);
  if (error) return 0;
  return rows.length;
}
