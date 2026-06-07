import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS, normalizeGeneratedDocs } from './ids';
import { getCatalogDocument, getVisibleCatalog } from './catalog';
import type { ProjectInput } from './suggest';
import {
  deriveUploadRequirements,
  type UploadRequirement,
} from './uploadRequirements';
import type { UploadSlot } from '../types';
import type { GeneratedDoc } from '../types';

export type CompletenessItem = {
  documentId: string;
  label: string;
  sourceType: 'ai_generated' | 'user_upload' | 'hybrid';
  required: boolean;
  status: 'complete' | 'generating' | 'missing' | 'uploaded' | 'template_ready';
  detail: string;
};

export type MissingRequiredDoc = {
  documentId: string;
  label: string;
  directive?: string;
};

export type CompletenessTone = 'gray' | 'blue' | 'yellow' | 'green';

export type PackageCompleteness = {
  total: number;
  complete: number;
  percent: number;
  items: CompletenessItem[];
  isComplete: boolean;
  canExportZip: boolean;
  missingRequired: string[];
  missingRequiredDocs: MissingRequiredDoc[];
  uploadRequirements: UploadRequirement[];
};

function uploadStatus(
  documentId: string,
  uploads: UploadSlot[]
): UploadSlot['status'] {
  return uploads.find((u) => u.documentId === documentId)?.status ?? 'missing';
}

function isUploadDone(status: UploadSlot['status']): boolean {
  return status === 'uploaded';
}

export function computePackageCompleteness(
  input: ProjectInput,
  selectedAi: DocumentId[],
  selectedHybrid: DocumentId[],
  generatedDocs: GeneratedDoc[],
  uploads: UploadSlot[],
  generating = false
): PackageCompleteness {
  const visible = getVisibleCatalog(input);
  const normalizedDocs = normalizeGeneratedDocs(generatedDocs);
  const generatedIds = new Set(normalizedDocs.map((d) => d.documentId));
  const uploadRequirements = deriveUploadRequirements(input);

  const aiAndHybrid = visible.filter((d) => {
    if (d.sourceType === 'ai_generated') {
      return CORE_DOCUMENT_IDS.includes(d.id) || selectedAi.includes(d.id);
    }
    if (d.sourceType === 'hybrid') {
      return d.required || selectedHybrid.includes(d.id);
    }
    return false;
  });

  const aiItems: CompletenessItem[] = aiAndHybrid.map((def) => {
    if (def.sourceType === 'hybrid') {
      const up = uploadStatus(def.id, uploads);
      const tpl = generatedIds.has(def.id);
      if (isUploadDone(up)) {
        return {
          documentId: def.id,
          label: def.label,
          sourceType: def.sourceType,
          required: def.required,
          status: 'uploaded' as const,
          detail: 'Ferdig versjon lastet opp',
        };
      }
      if (tpl) {
        return {
          documentId: def.id,
          label: def.label,
          sourceType: def.sourceType,
          required: def.required,
          status: 'template_ready' as const,
          detail: 'Mal klar — venter på signering/opplasting',
        };
      }
      return {
        documentId: def.id,
        label: def.label,
        sourceType: def.sourceType,
        required: def.required,
        status: 'missing' as const,
        detail: selectedHybrid.includes(def.id)
          ? 'Mal ikke generert ennå'
          : 'Ikke valgt',
      };
    }
    const done = generatedIds.has(def.id);
    return {
      documentId: def.id,
      label: def.label,
      sourceType: def.sourceType,
      required: def.required,
      status: done
        ? 'complete'
        : generating && selectedAi.includes(def.id)
          ? 'generating'
          : 'missing',
      detail: done
        ? 'AI — ferdig'
        : generating
          ? 'AI — genererer'
          : 'AI — mangler',
    };
  });

  const uploadItems: CompletenessItem[] = uploadRequirements.map((req) => {
    const up = uploadStatus(req.id, uploads);
    return {
      documentId: req.id,
      label: req.label,
      sourceType: 'user_upload' as const,
      required: req.required,
      status: isUploadDone(up) ? 'uploaded' : 'missing',
      detail: isUploadDone(up) ? 'Lastet opp' : 'Mangler opplasting',
    };
  });

  const items = [...aiItems, ...uploadItems];

  const complete = items.filter(
    (i) =>
      i.status === 'complete' ||
      i.status === 'uploaded' ||
      (i.sourceType === 'hybrid' && i.status === 'template_ready' && !i.required)
  ).length;

  const missingItems = items.filter(
    (i) =>
      i.required &&
      i.status !== 'complete' &&
      i.status !== 'uploaded'
  );
  const missingRequired = missingItems.map((i) => i.label);
  const missingRequiredDocs: MissingRequiredDoc[] = missingItems.map((i) => {
    const uploadReq = uploadRequirements.find((r) => r.id === i.documentId);
    const catalog = getCatalogDocument(i.documentId as DocumentId);
    return {
      documentId: i.documentId,
      label: i.label,
      directive: uploadReq?.directive ?? catalog?.directive,
    };
  });

  const requiredTotal = items.filter((i) => i.required).length;
  const requiredComplete = items.filter(
    (i) =>
      i.required &&
      (i.status === 'complete' || i.status === 'uploaded')
  ).length;

  const percent =
    requiredTotal > 0
      ? Math.round((requiredComplete / requiredTotal) * 100)
      : Math.round((complete / Math.max(items.length, 1)) * 100);

  const isComplete = missingRequired.length === 0;

  return {
    total: items.length,
    complete,
    percent,
    items,
    isComplete,
    canExportZip: isComplete,
    missingRequired,
    missingRequiredDocs,
    uploadRequirements,
  };
}

export function getCompletenessTone(
  percent: number,
  generating: boolean,
  isComplete: boolean
): CompletenessTone {
  if (isComplete) return 'green';
  if (generating || (percent > 0 && percent < 50)) return 'blue';
  if (percent >= 50) return 'yellow';
  return 'gray';
}

export function getCompletenessSummary(
  completeness: PackageCompleteness,
  projectStatus: 'draft' | 'review' | 'locked',
  generating: boolean
): string {
  if (projectStatus === 'locked') {
    return 'Godkjent og låst — kun lesing og nedlasting';
  }
  if (completeness.isComplete) {
    return 'Komplett — klar til å låses og signeres';
  }
  if (generating) {
    return 'Generering pågår — nedlasting er alltid tillatt';
  }
  const n = completeness.missingRequired.length;
  if (n === 0) {
    return 'Klar for gjennomgang';
  }
  const uploadsOnly = completeness.missingRequiredDocs.every((d) => {
    const item = completeness.items.find((i) => i.documentId === d.documentId);
    return item?.sourceType === 'user_upload' || item?.sourceType === 'hybrid';
  });
  if (uploadsOnly) {
    return `Klar for gjennomgang — mangler ${n} opplasting${n === 1 ? '' : 'er'} før låsing`;
  }
  return `Mangler ${n} obligatorisk${n === 1 ? '' : 'e'} dokument${n === 1 ? '' : 'er'} — utkast kan lastes ned`;
}

export function getRequiredUploadIds(input: ProjectInput): string[] {
  return deriveUploadRequirements(input)
    .filter((r) => r.required)
    .map((r) => r.id);
}
