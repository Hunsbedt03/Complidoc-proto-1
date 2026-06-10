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
  let inserted = 0;

  for (const documentId of documentIds) {
    const { data: existing } = await supabase
      .from('document_revisions')
      .select('id')
      .eq('project_id', projectId)
      .eq('document_id', documentId)
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    const { error } = await supabase.from('document_revisions').insert({
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
    });

    if (!error) inserted += 1;
  }

  return inserted;
}
