import type { ArchiveDocument, ProjectArchiveLink } from '@/lib/archive/types';
import {
  defaultArchiveCategory,
  defaultArchiveLabel,
  defaultIsoCerts,
} from '@/lib/archive/mappers';

const STORAGE_KEY = 'samsiq-company-archive';
const LINKS_KEY = 'samsiq-archive-links';

type LocalArchiveStore = {
  companyId: string;
  documents: ArchiveDocument[];
};

function readStore(): LocalArchiveStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalArchiveStore;
  } catch {
    return null;
  }
}

function writeStore(store: LocalArchiveStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getLocalCompanyId(userId: string): string {
  return `local-${userId}`;
}

export function listLocalArchiveDocuments(companyId: string): ArchiveDocument[] {
  const store = readStore();
  if (!store || store.companyId !== companyId) return [];
  return store.documents.filter((d) => d.isActive);
}

export function saveLocalArchiveDocument(
  companyId: string,
  input: {
    documentTypeId: string;
    label: string;
    fileName: string;
    fileBase64: string;
    mimeType: string;
    fileSize: number;
    version: string;
    validFrom?: string;
    validUntil?: string;
    isoCertifications?: string[];
    reviewIntervalMonths?: number;
    tags?: string[];
    notes?: string;
    uploadedBy?: string;
    replaceExistingId?: string;
  }
): ArchiveDocument {
  const store = readStore() ?? { companyId, documents: [] };
  if (store.companyId !== companyId) {
    store.companyId = companyId;
    store.documents = [];
  }

  if (input.replaceExistingId) {
    store.documents = store.documents.map((d) =>
      d.id === input.replaceExistingId
        ? { ...d, isActive: false, supersededBy: undefined }
        : d
    );
  } else {
    store.documents = store.documents.map((d) =>
      d.documentTypeId === input.documentTypeId && d.isActive
        ? { ...d, isActive: false }
        : d
    );
  }

  const newDoc: ArchiveDocument = {
    id: crypto.randomUUID(),
    companyId,
    documentTypeId: input.documentTypeId,
    label: input.label || defaultArchiveLabel(input.documentTypeId),
    category: defaultArchiveCategory(input.documentTypeId),
    fileName: input.fileName,
    filePath: `local://${input.documentTypeId}/${input.fileName}`,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    version: input.version || 'v1',
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    isoCertifications: (input.isoCertifications ??
      defaultIsoCerts(input.documentTypeId)) as ArchiveDocument['isoCertifications'],
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date().toISOString(),
    reviewIntervalMonths: input.reviewIntervalMonths,
    tags: input.tags ?? [],
    notes: input.notes,
    isActive: true,
  };

  (newDoc as ArchiveDocument & { fileBase64?: string }).fileBase64 =
    input.fileBase64;

  if (input.replaceExistingId) {
    const old = store.documents.find((d) => d.id === input.replaceExistingId);
    if (old) old.supersededBy = newDoc.id;
  }

  store.documents.unshift(newDoc);
  writeStore(store);
  return newDoc;
}

export function getLocalArchiveFileBase64(docId: string): string | null {
  const store = readStore();
  const doc = store?.documents.find((d) => d.id === docId);
  return (doc as ArchiveDocument & { fileBase64?: string })?.fileBase64 ?? null;
}

type LocalLinksStore = Record<string, ProjectArchiveLink[]>;

function readLinks(): LocalLinksStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    return raw ? (JSON.parse(raw) as LocalLinksStore) : {};
  } catch {
    return {};
  }
}

function writeLinks(links: LocalLinksStore) {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export function getLocalProjectArchiveLinks(
  projectId: string
): ProjectArchiveLink[] {
  return readLinks()[projectId] ?? [];
}

export function saveLocalProjectArchiveLinks(
  projectId: string,
  links: ProjectArchiveLink[]
) {
  const all = readLinks();
  all[projectId] = links;
  writeLinks(all);
}

export function autoLinkLocalArchive(
  projectId: string,
  companyId: string,
  documentTypeIds: string[]
): ProjectArchiveLink[] {
  const active = listLocalArchiveDocuments(companyId);
  const byType = new Map(
    active.map((d) => [d.documentTypeId, d])
  );
  const links: ProjectArchiveLink[] = [];

  for (const typeId of documentTypeIds) {
    const doc = byType.get(typeId);
    if (!doc) continue;
    links.push({
      projectId,
      archiveDocumentId: doc.id,
      documentTypeId: typeId,
      linkStatus: 'auto_linked',
      linkedAt: new Date().toISOString(),
      label: doc.label,
      version: doc.version,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    });
  }

  const existing = getLocalProjectArchiveLinks(projectId);
  const merged = [...existing];
  for (const link of links) {
    if (!merged.some((m) => m.documentTypeId === link.documentTypeId)) {
      merged.push(link);
    }
  }
  saveLocalProjectArchiveLinks(projectId, merged);
  return merged;
}
