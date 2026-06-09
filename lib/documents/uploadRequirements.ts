import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import {
  catalogToUploadRequirement,
  deriveRequirements,
  type ProjectContext,
} from './requirements';

export type UploadRequirementId = string;

export type UploadRequirement = {
  id: UploadRequirementId;
  label: string;
  description: string;
  directive?: string;
  acceptedFormats: string[];
  required: boolean;
  reason: string;
  requiredContent?: string[];
};

export type { ProjectContext };

/**
 * Utleder hvilke filer brukeren bør laste opp basert på maskindata,
 * sertifiseringer og manuelt lagt til dokumenter.
 */
export function deriveUploadRequirements(
  project: ProjectContext,
  selectedAi: DocumentId[] = CORE_DOCUMENT_IDS,
  selectedHybrid: DocumentId[] = []
): UploadRequirement[] {
  return deriveRequirements(project, selectedAi, selectedHybrid)
    .filter((d) => d.sourceType === 'user_upload')
    .map(catalogToUploadRequirement);
}

export function uploadRequirementById(
  id: string,
  project: ProjectContext,
  selectedAi?: DocumentId[],
  selectedHybrid?: DocumentId[]
): UploadRequirement | undefined {
  return deriveUploadRequirements(project, selectedAi, selectedHybrid).find(
    (r) => r.id === id
  );
}
