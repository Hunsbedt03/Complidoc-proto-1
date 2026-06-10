'use client';

import { useEffect, useState } from 'react';
import {
  PROJECT_ACTIVITY_ID,
  type DocumentRevision,
} from '@/lib/revisions';
import { fetchProjectRevisions } from '@/lib/revisions/saveRevision';

type Props = {
  projectId: string;
  documentLabels: Record<string, string>;
};

function actionLabel(changeType: DocumentRevision['changeType']): string {
  if (changeType === 'project_created') return 'opprettet';
  if (changeType === 'user_edit') return 'redigerte';
  if (changeType === 'ai' || changeType === 'ai_regeneration') return 'regenererte';
  if (changeType === 'restore') return 'gjenopprettet';
  if (changeType === 'file_upload') return 'lastet opp';
  if (changeType === 'locked') return 'låste';
  return 'genererte';
}

export function ProjectActivityLog({ projectId, documentLabels }: Props) {
  const [rows, setRows] = useState<DocumentRevision[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchProjectRevisions(projectId)
      .then((all) => {
        if (!cancelled) setRows(all.slice(0, 20));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!rows.length) return null;

  return (
    <section className="activity-log">
      <h3 className="section-label">Aktivitetslogg</h3>
      <ul className="activity-log-list">
        {rows.map((r) => {
          const isProject = r.documentId === PROJECT_ACTIVITY_ID;
          const label = isProject
            ? 'prosjektet'
            : (documentLabels[r.documentId] ?? r.documentId);
          return (
            <li key={r.id} className="activity-log-row">
              <span className="activity-log-time">
                {new Date(r.changedAt).toLocaleString('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="activity-log-text">
                {r.changedByName} {actionLabel(r.changeType)} {label}
                {!isProject ? ` (v${r.revision})` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
