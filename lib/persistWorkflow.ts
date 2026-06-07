import type { ProjectStatus } from './projectStatus';

/** Best-effort sky-lagring av workflow_status (lokal fallback fungerer uten). */
export async function persistWorkflowStatus(
  projectId: string,
  workflowStatus: ProjectStatus
): Promise<void> {
  try {
    const res = await fetch('/api/projects/workflow', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, workflowStatus }),
    });
    if (!res.ok) {
      console.warn('[samsiq] workflow sync:', res.status);
    }
  } catch (err) {
    console.warn('[samsiq] workflow sync feilet:', err);
  }
}
