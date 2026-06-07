export type ProjectStatus = 'draft' | 'review' | 'locked';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Under arbeid',
  review: 'Til gjennomgang',
  locked: 'Godkjent ✓',
};

export function isProjectEditable(status: ProjectStatus): boolean {
  return status !== 'locked';
}
