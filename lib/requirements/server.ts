import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { requirementDocumentLabel } from '@/lib/requirements/labels';
import type {
  ChecklistRequirementItem,
  PendingSuggestion,
  RequirementKilde,
} from '@/lib/requirements/types';

export async function loadProjectDocumentPresence(
  supabase: SupabaseClient,
  projectId: string
): Promise<Set<string>> {
  const present = new Set<string>();

  const { data: revisions } = await supabase
    .from('document_revisions')
    .select('document_id')
    .eq('project_id', projectId);

  for (const row of revisions ?? []) {
    if (row.document_id && row.document_id !== '__project__') {
      present.add(row.document_id);
    }
  }

  const { data: uploads } = await supabase
    .from('uploaded_documents')
    .select('document_id')
    .eq('project_id', projectId)
    .eq('is_current', true);

  for (const row of uploads ?? []) {
    if (row.document_id) present.add(row.document_id);
  }

  return present;
}

export async function loadProjectChecklist(
  supabase: SupabaseClient,
  projectId: string
): Promise<ChecklistRequirementItem[]> {
  const [{ data: rows, error }, present] = await Promise.all([
    supabase
      .from('project_document_checklist')
      .select('project_id, kilde, document_id, detaljer')
      .eq('project_id', projectId),
    loadProjectDocumentPresence(supabase, projectId),
  ]);

  if (error) throw error;

  return (rows ?? []).map((row) => ({
    projectId: row.project_id as string,
    kilde: row.kilde as RequirementKilde,
    documentId: row.document_id as string,
    label: requirementDocumentLabel(row.document_id as string),
    detaljer: (row.detaljer as string | null) ?? null,
    present: present.has(row.document_id as string),
  }));
}

export async function loadPendingSuggestions(
  supabase: SupabaseClient,
  projectId: string
): Promise<PendingSuggestion[]> {
  const { data, error } = await supabase
    .from('document_requirement_suggestions')
    .select('id, document_id, kilde_regel, status')
    .eq('project_id', projectId)
    .eq('status', 'foreslatt')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    documentId: row.document_id as string,
    label: requirementDocumentLabel(row.document_id as string),
    kildeRegel: (row.kilde_regel as string | null) ?? null,
    status: 'foreslatt' as const,
  }));
}
