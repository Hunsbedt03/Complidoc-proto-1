import { isArchiveEligibleId } from './eligible';
import { deriveRequirements } from '@/lib/documents/requirements';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import type { DocumentId } from '@/lib/documents/ids';
import {
  autoLinkLocalArchive,
  getLocalCompanyId,
  getLocalProjectArchiveLinks,
} from '@/lib/localArchive';
import { projectInputFromForm } from '@/lib/projectInput';
import type { ProjectArchiveLink, ProjectFormData } from '@/lib/types';

/** Gjenoppretter arkivkoblinger fra lagret payload, lokalt arkiv eller auto-link. */
export function restoreProjectArchiveLinks(
  projectId: string,
  form: ProjectFormData,
  stored?: ProjectArchiveLink[],
  userId?: string
): ProjectArchiveLink[] {
  if (stored?.length) {
    return stored;
  }

  const local = getLocalProjectArchiveLinks(projectId);
  if (local.length) {
    return local;
  }

  const input = projectInputFromForm(form);
  const raw = form.selectedDocuments ?? CORE_DOCUMENT_IDS;
  const selectedAi = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
  ) as DocumentId[];
  const selectedHybrid = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
  ) as DocumentId[];

  const eligibleTypeIds = deriveRequirements(input, selectedAi, selectedHybrid)
    .filter((d) => isArchiveEligibleId(d.id))
    .map((d) => d.id);

  if (!eligibleTypeIds.length) return [];

  return autoLinkLocalArchive(
    projectId,
    getLocalCompanyId(userId ?? projectId),
    eligibleTypeIds
  );
}
