export type RevisionChangeType =
  | 'initial_generation'
  | 'ai_regeneration'
  | 'user_edit'
  | 'file_upload'
  | 'locked';

export type RevisionSource =
  | 'ai_generated'
  | 'user_edited'
  | 'ai_regenerated'
  | 'file_upload';

export type DocumentRevision = {
  id: string;
  projectId: string;
  documentId: string;
  revision: number;
  content: string;
  contentJson?: string;
  changeType: RevisionChangeType;
  changeNote: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  source: RevisionSource;
};

const STORAGE_KEY = 'samsiq-document-revisions';

function readAll(): DocumentRevision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DocumentRevision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: DocumentRevision[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 500)));
}

export function getDocumentRevisions(
  projectId: string,
  documentId: string
): DocumentRevision[] {
  return readAll()
    .filter((r) => r.projectId === projectId && r.documentId === documentId)
    .sort((a, b) => b.revision - a.revision);
}

export function listProjectActivity(projectId: string): DocumentRevision[] {
  return readAll()
    .filter((r) => r.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
}

function nextRevision(projectId: string, documentId: string): number {
  const existing = getDocumentRevisions(projectId, documentId);
  return existing.length ? existing[0].revision + 1 : 1;
}

export function appendRevision(
  input: Omit<DocumentRevision, 'id' | 'revision' | 'changedAt'> & {
    revision?: number;
  }
): DocumentRevision {
  const row: DocumentRevision = {
    ...input,
    id: crypto.randomUUID(),
    revision: input.revision ?? nextRevision(input.projectId, input.documentId),
    changedAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(row);
  writeAll(all);
  return row;
}

export function seedInitialRevisions(
  projectId: string,
  documentIds: string[],
  changedByName: string
): void {
  for (const documentId of documentIds) {
    if (getDocumentRevisions(projectId, documentId).length > 0) continue;
    appendRevision({
      projectId,
      documentId,
      content: '',
      changeType: 'initial_generation',
      changeNote: 'Automatisk generert ved prosjektopprettelse',
      changedBy: 'samsiq-ai',
      changedByName: 'Samsiq AI',
      source: 'ai_generated',
    });
  }
}
