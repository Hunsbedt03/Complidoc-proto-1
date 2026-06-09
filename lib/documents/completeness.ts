import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS, normalizeGeneratedDocs } from './ids';
import { getCatalogDocument } from './catalog';
import type { ProjectContext } from './types';
import { CATEGORY_LABELS, type DocumentCategory } from './types';
import { deriveRequirements, catalogToUploadRequirement } from './requirements';
import type { UploadRequirement } from './uploadRequirements';
import type { GeneratedDoc, ProjectArchiveLink, UploadSlot } from '../types';
import { isArchiveEligibleId } from '../archive/eligible';

export type CompletenessItem = {
  documentId: string;
  label: string;
  sourceType: 'ai_generated' | 'user_upload' | 'hybrid';
  required: boolean;
  status: 'complete' | 'generating' | 'missing' | 'uploaded' | 'template_ready';
  detail: string;
  category: DocumentCategory;
};

export type CategoryCompleteness = {
  category: DocumentCategory;
  label: string;
  complete: number;
  total: number;
  percent: number;
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
  categories: CategoryCompleteness[];
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

function isItemComplete(item: CompletenessItem): boolean {
  return (
    item.status === 'complete' ||
    item.status === 'uploaded' ||
    (item.sourceType === 'hybrid' &&
      item.status === 'template_ready' &&
      !item.required)
  );
}

export function computeCategoryCompleteness(
  items: CompletenessItem[]
): CategoryCompleteness[] {
  const byCat = new Map<DocumentCategory, CompletenessItem[]>();
  for (const item of items) {
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }

  return [...byCat.entries()]
    .map(([category, catItems]) => {
      const requiredItems = catItems.filter((i) => i.required);
      const pool = requiredItems.length ? requiredItems : catItems;
      const complete = pool.filter(isItemComplete).length;
      const total = pool.length;
      return {
        category,
        label: CATEGORY_LABELS[category] ?? category,
        complete,
        total,
        percent: total > 0 ? Math.round((complete / total) * 100) : 0,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'nb'));
}

export function computePackageCompleteness(
  input: ProjectContext,
  selectedAi: DocumentId[],
  selectedHybrid: DocumentId[],
  generatedDocs: GeneratedDoc[],
  uploads: UploadSlot[],
  generating = false,
  archiveLinks: ProjectArchiveLink[] = []
): PackageCompleteness {
  const archiveByType = new Map(
    archiveLinks.map((l) => [l.documentTypeId.trim().toLowerCase(), l])
  );
  const normalizedDocs = normalizeGeneratedDocs(generatedDocs);
  const generatedIds = new Set(normalizedDocs.map((d) => d.documentId));
  const requirements = deriveRequirements(input, selectedAi, selectedHybrid);
  const uploadRequirements = requirements
    .filter((d) => d.sourceType === 'user_upload')
    .map(catalogToUploadRequirement);

  const items: CompletenessItem[] = requirements.map((def) => {
    const category = def.category;

    if (def.sourceType === 'user_upload') {
      const up = uploadStatus(def.id, uploads);
      const fromArchive =
        isArchiveEligibleId(def.id) &&
        archiveByType.has(def.id.trim().toLowerCase());
      const uploaded = isUploadDone(up) || fromArchive;
      return {
        documentId: def.id,
        label: def.label,
        sourceType: 'user_upload' as const,
        required: def.required,
        status: uploaded ? 'uploaded' : 'missing',
        detail: fromArchive && !isUploadDone(up)
          ? 'Fra bedriftsarkiv'
          : uploaded
            ? 'Lastet opp'
            : 'Mangler opplasting',
        category,
      };
    }

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
          category,
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
          category,
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
        category,
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
      category,
    };
  });

  const complete = items.filter(isItemComplete).length;

  const missingItems = items.filter(
    (i) => i.required && !isItemComplete(i)
  );
  const missingRequired = missingItems.map((i) => i.label);
  const missingRequiredDocs: MissingRequiredDoc[] = missingItems.map((i) => {
    const uploadReq = uploadRequirements.find((r) => r.id === i.documentId);
    const catalog = getCatalogDocument(i.documentId as DocumentId);
    return {
      documentId: i.documentId,
      label: i.label,
      directive: uploadReq?.directive ?? catalog?.directive ?? catalog?.standard,
    };
  });

  const requiredTotal = items.filter((i) => i.required).length;
  const requiredComplete = items.filter(
    (i) => i.required && isItemComplete(i)
  ).length;

  const percent =
    requiredTotal > 0
      ? Math.round((requiredComplete / requiredTotal) * 100)
      : Math.round((complete / Math.max(items.length, 1)) * 100);

  const isComplete = missingRequired.length === 0;
  const categories = computeCategoryCompleteness(items);

  return {
    total: items.length,
    complete,
    percent,
    items,
    categories,
    isComplete,
    canExportZip: true,
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

export function getRequiredUploadIds(
  input: ProjectContext,
  selectedAi?: DocumentId[],
  selectedHybrid?: DocumentId[]
): string[] {
  return deriveRequirements(
    input,
    selectedAi ?? CORE_DOCUMENT_IDS,
    selectedHybrid ?? []
  )
    .filter((r) => r.sourceType === 'user_upload' && r.required)
    .map((r) => r.id);
}
