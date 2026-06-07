import {
  appendRevision,
  type DocumentRevision,
  type RevisionChangeType,
  type RevisionSource,
} from '@/lib/revisions';

export type SaveRevisionInput = {
  projectId: string;
  documentId: string;
  content: string;
  contentJson: string;
  changeNote: string;
  changeType: RevisionChangeType;
  changedByName: string;
  source: RevisionSource;
  changedBy?: string;
};

export type SaveRevisionResult = {
  revision: DocumentRevision;
  storage: 'supabase' | 'local';
};

/** Lagre revisjon lokalt + best-effort synk til Supabase. */
export async function saveDocumentRevision(
  input: SaveRevisionInput
): Promise<SaveRevisionResult> {
  let cloudRevision: DocumentRevision | null = null;

  try {
    const res = await fetch('/api/projects/revisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      revision?: DocumentRevision;
      error?: string;
    };
    if (res.ok && json.revision) {
      cloudRevision = json.revision;
    }
  } catch {
    /* lokal fallback */
  }

  if (cloudRevision) {
    const all = readLocalRevisions();
    const filtered = all.filter(
      (r) =>
        !(
          r.projectId === cloudRevision!.projectId &&
          r.documentId === cloudRevision!.documentId &&
          r.revision === cloudRevision!.revision
        )
    );
    writeLocalRevisions([...filtered, cloudRevision]);
    return { revision: cloudRevision, storage: 'supabase' };
  }

  const local = appendRevision({
    projectId: input.projectId,
    documentId: input.documentId,
    content: input.content,
    contentJson: input.contentJson,
    changeType: input.changeType,
    changeNote: input.changeNote,
    changedBy: input.changedBy ?? 'user',
    changedByName: input.changedByName,
    source: input.source,
  });

  return { revision: local, storage: 'local' };
}

export async function fetchDocumentRevisions(
  projectId: string,
  documentId: string
): Promise<DocumentRevision[]> {
  try {
    const params = new URLSearchParams({ projectId, documentId });
    const res = await fetch(`/api/projects/revisions?${params}`);
    if (res.ok) {
      const json = (await res.json()) as { revisions?: DocumentRevision[] };
      if (json.revisions?.length) {
        mergeCloudRevisions(projectId, documentId, json.revisions);
        return json.revisions;
      }
    }
  } catch {
    /* fall through */
  }
  const { getDocumentRevisions } = await import('@/lib/revisions');
  return getDocumentRevisions(projectId, documentId);
}

function readLocalRevisions(): DocumentRevision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('samsiq-document-revisions');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DocumentRevision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRevisions(rows: DocumentRevision[]) {
  localStorage.setItem('samsiq-document-revisions', JSON.stringify(rows.slice(0, 500)));
}

function mergeCloudRevisions(
  projectId: string,
  documentId: string,
  cloud: DocumentRevision[]
) {
  const all = readLocalRevisions();
  const rest = all.filter(
    (r) => !(r.projectId === projectId && r.documentId === documentId)
  );
  writeLocalRevisions([...rest, ...cloud]);
}
