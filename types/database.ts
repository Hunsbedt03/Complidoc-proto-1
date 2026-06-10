/** Supabase-rad for document_revisions (snake_case). */
export type DbDocumentRevision = {
  id: string;
  project_id: string;
  document_id: string;
  revision: number;
  content: string;
  content_json: unknown | null;
  change_type: string;
  change_note: string;
  changed_by: string | null;
  changed_by_name: string;
  changed_at: string;
  source: string;
};

export type {
  DocumentRevision,
  RevisionChangeType,
  RevisionSource,
} from '@/lib/revisions';
