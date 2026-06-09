import type { AutoLinkResult } from './types';
import type { ProjectArchiveLink } from '@/lib/types';
import { autoLinkLocalArchive } from '@/lib/localArchive';

export function mapAutoLinkResultsToLinks(
  results: AutoLinkResult[],
  projectId: string
): ProjectArchiveLink[] {
  return results
    .filter((r) => r.status === 'auto_linked' && r.link)
    .map((r) => ({
      ...r.link!,
      projectId,
    }));
}

export function resolveArchiveLinksAfterSave(
  projectId: string,
  saveJson: {
    archiveLinks?: AutoLinkResult[];
    localArchiveEligibleIds?: string[];
    localCompanyId?: string;
  }
): ProjectArchiveLink[] {
  const cloud = mapAutoLinkResultsToLinks(saveJson.archiveLinks ?? [], projectId);

  const local =
    saveJson.localArchiveEligibleIds?.length && saveJson.localCompanyId
      ? autoLinkLocalArchive(
          projectId,
          saveJson.localCompanyId,
          saveJson.localArchiveEligibleIds
        )
      : [];

  const merged = new Map<string, ProjectArchiveLink>();
  for (const link of local) merged.set(link.documentTypeId, link);
  for (const link of cloud) merged.set(link.documentTypeId, link);

  return [...merged.values()];
}
