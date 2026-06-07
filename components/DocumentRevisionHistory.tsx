'use client';

import {
  getDocumentRevisions,
  type DocumentRevision,
  type RevisionChangeType,
} from '@/lib/revisions';
import type { DocumentId } from '@/lib/documents/ids';
import type { ProjectStatus } from '@/lib/projectStatus';

const TYPE_LABEL: Record<RevisionChangeType, string> = {
  initial_generation: '🤖 Første generering',
  ai_regeneration: '🤖 AI-regenerering',
  user_edit: '✏️ Manuell redigering',
  file_upload: '📎 Filopplasting',
  locked: '🔒 Låst snapshot',
};

type Props = {
  projectId: string;
  documentId: DocumentId;
  projectStatus: ProjectStatus;
  onRestore?: (revision: DocumentRevision) => void;
  onView?: (revision: DocumentRevision) => void;
};

export function DocumentRevisionHistory({
  projectId,
  documentId,
  projectStatus,
  onRestore,
  onView,
}: Props) {
  const rows = getDocumentRevisions(projectId, documentId);

  if (!rows.length) {
    return <p className="form-info">Ingen revisjonshistorikk ennå.</p>;
  }

  return (
    <ul className="revision-list">
      {rows.map((r) => (
        <li key={r.id} className="revision-row">
          <div className="revision-row-head">
            <span className="revision-ver">v{r.revision}</span>
            <span className="revision-meta">
              {new Date(r.changedAt).toLocaleString('nb-NO')} · {r.changedByName} ·{' '}
              {TYPE_LABEL[r.changeType]}
            </span>
          </div>
          <p className="revision-note">&quot;{r.changeNote}&quot;</p>
          <div className="revision-actions">
            <button type="button" className="btn-dl" onClick={() => onView?.(r)}>
              Vis denne versjonen
            </button>
            {projectStatus !== 'locked' && onRestore ? (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  const reason = prompt('Grunn for gjenoppretting (kort):');
                  if (reason?.trim()) onRestore(r);
                }}
              >
                Gjenopprett
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
