'use client';

import { listProjectActivity } from '@/lib/revisions';

type Props = {
  projectId: string;
  documentLabels: Record<string, string>;
};

export function ProjectActivityLog({ projectId, documentLabels }: Props) {
  const rows = listProjectActivity(projectId).slice(0, 20);

  if (!rows.length) return null;

  return (
    <section className="activity-log">
      <h3 className="section-label">Aktivitetslogg</h3>
      <ul className="activity-log-list">
        {rows.map((r) => {
          const label = documentLabels[r.documentId] ?? r.documentId;
          const action =
            r.changeType === 'user_edit'
              ? 'redigerte'
              : r.changeType === 'ai_regeneration'
                ? 'regenererte'
                : r.changeType === 'file_upload'
                  ? 'lastet opp'
                  : r.changeType === 'locked'
                    ? 'låste'
                    : 'genererte';
          return (
            <li key={r.id} className="activity-log-row">
              <span className="activity-log-time">
                {new Date(r.changedAt).toLocaleString('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="activity-log-text">
                {r.changedByName} {action} {label} (v{r.revision})
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
