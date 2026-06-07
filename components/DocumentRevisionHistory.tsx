'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getDocumentRevisions,
  type DocumentRevision,
  type RevisionSource,
} from '@/lib/revisions';
import { fetchDocumentRevisions } from '@/lib/revisions/saveRevision';
import type { DocumentId } from '@/lib/documents/ids';
import type { ProjectStatus } from '@/lib/projectStatus';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'nå';
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d siden`;
  return new Date(iso).toLocaleDateString('nb-NO');
}

function sourceIcon(source: RevisionSource): string {
  if (source === 'ai_regenerated' || source === 'ai_generated') return '🤖';
  if (source === 'user_edited') return '✏️';
  if (source === 'file_upload') return '📎';
  return '🤖';
}

type Props = {
  projectId: string;
  documentId: DocumentId;
  projectStatus: ProjectStatus;
  currentRevision?: number;
  refreshKey?: number;
  onRestore?: (revision: DocumentRevision) => void;
  onView?: (revision: DocumentRevision) => void;
};

export function DocumentRevisionHistory({
  projectId,
  documentId,
  projectStatus,
  currentRevision,
  refreshKey = 0,
  onRestore,
  onView,
}: Props) {
  const [rows, setRows] = useState<DocumentRevision[]>(() =>
    getDocumentRevisions(projectId, documentId)
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await fetchDocumentRevisions(projectId, documentId);
      setRows(fetched);
    } finally {
      setLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading && !rows.length) {
    return <p className="form-info">Laster revisjonshistorikk…</p>;
  }

  if (!rows.length) {
    return <p className="form-info">Ingen revisjonshistorikk ennå.</p>;
  }

  const current = currentRevision ?? rows[0]?.revision;

  return (
    <ul className="revision-list">
      {rows.map((rev) => (
        <li key={rev.id} className="revision-row">
          <div className="revision-row-main">
            <span className="revision-ver">v{rev.revision}</span>
            <div className="revision-row-body">
              <div className="revision-row-head">
                <span className="revision-icon" aria-hidden>
                  {sourceIcon(rev.source)}
                </span>
                <span className="revision-author">{rev.changedByName}</span>
                <span className="revision-time">
                  {formatRelativeTime(rev.changedAt)}
                </span>
              </div>
              <p className="revision-note">{rev.changeNote}</p>
            </div>
            <div className="revision-actions">
              <button
                type="button"
                className="btn-dl btn-xs"
                onClick={() => onView?.(rev)}
              >
                Vis
              </button>
              {projectStatus !== 'locked' &&
              onRestore &&
              rev.revision !== current ? (
                <button
                  type="button"
                  className="btn-cancel btn-xs"
                  onClick={() => {
                    const ok = confirm(
                      `Gjenopprett til v${rev.revision}? Dette oppretter en ny revisjon med innholdet fra v${rev.revision}.`
                    );
                    if (ok) onRestore(rev);
                  }}
                >
                  Gjenopprett
                </button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
