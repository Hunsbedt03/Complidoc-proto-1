import type { ProjectArchiveLink, ProjectFormData } from '@/lib/types';
import type { ArchiveSyncDebug } from './syncLinks';

export function mergeArchiveLinks(
  existing: ProjectArchiveLink[],
  incoming: ProjectArchiveLink[]
): ProjectArchiveLink[] {
  const map = new Map<string, ProjectArchiveLink>();
  for (const link of existing) {
    map.set(link.documentTypeId.trim().toLowerCase(), link);
  }
  for (const link of incoming) {
    map.set(link.documentTypeId.trim().toLowerCase(), link);
  }
  return [...map.values()];
}

export async function fetchSyncedArchiveLinks(
  projectId: string,
  form: ProjectFormData
): Promise<{ links: ProjectArchiveLink[]; debug?: ArchiveSyncDebug }> {
  const res = await fetch('/api/archive/sync-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, form }),
  });

  if (!res.ok) {
    return { links: [] };
  }

  const json = (await res.json()) as {
    links?: ProjectArchiveLink[];
    debug?: ArchiveSyncDebug;
  };

  return { links: json.links ?? [], debug: json.debug };
}
