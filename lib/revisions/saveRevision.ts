import type {
  DocumentRevision,
  RevisionChangeType,
  RevisionSource,
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
};

async function parseRevisionResponse(
  res: Response
): Promise<DocumentRevision> {
  const json = (await res.json()) as {
    revision?: DocumentRevision;
    error?: string;
  };
  if (!res.ok || !json.revision) {
    throw new Error(json.error ?? 'Kunne ikke lagre revisjon i Supabase');
  }
  return json.revision;
}

/** Lagre revisjon i Supabase (document_revisions). */
export async function saveDocumentRevision(
  input: SaveRevisionInput
): Promise<SaveRevisionResult> {
  const res = await fetch('/api/projects/revisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const revision = await parseRevisionResponse(res);
  return { revision };
}

/** Hent revisjoner for ett dokument fra Supabase. */
export async function fetchDocumentRevisions(
  projectId: string,
  documentId: string
): Promise<DocumentRevision[]> {
  const params = new URLSearchParams({ projectId, documentId });
  const res = await fetch(`/api/projects/revisions?${params}`);
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? 'Kunne ikke hente revisjonshistorikk');
  }
  const json = (await res.json()) as { revisions?: DocumentRevision[] };
  return json.revisions ?? [];
}

/** Hent alle revisjoner for et prosjekt (aktivitetslogg m.m.). */
export async function fetchProjectRevisions(
  projectId: string
): Promise<DocumentRevision[]> {
  const params = new URLSearchParams({ projectId });
  const res = await fetch(`/api/projects/revisions?${params}`);
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? 'Kunne ikke hente prosjektrevisjoner');
  }
  const json = (await res.json()) as { revisions?: DocumentRevision[] };
  return json.revisions ?? [];
}
