import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import { DOCUMENT_ID_TO_LEGACY } from './ids';
import type { CatalogDocument } from './catalog';
import { ALL_DOCUMENTS, getCatalogDocument, getVisibleCatalog } from './catalog';
import { deriveRequirements } from './requirements';
import { CATEGORY_LABELS, type DocumentCategory } from './types';
import type { ProjectContext } from './types';

export type DocumentDefinition = CatalogDocument;

export type DocumentGroup = {
  category: DocumentCategory;
  label: string;
  documents: CatalogDocument[];
};

export function getAllDocumentDefinitions(): CatalogDocument[] {
  return ALL_DOCUMENTS;
}

export function getDocumentDefinition(id: DocumentId): CatalogDocument | undefined {
  return getCatalogDocument(id);
}

export function getDefaultSelectedDocuments(): DocumentId[] {
  return [...CORE_DOCUMENT_IDS];
}

export function getVisibleGroups(
  input: ProjectContext,
  selectedAi: DocumentId[] = CORE_DOCUMENT_IDS,
  selectedHybrid: DocumentId[] = []
): DocumentGroup[] {
  const docs = deriveRequirements(input, selectedAi, selectedHybrid);
  const byCategory = new Map<DocumentCategory, CatalogDocument[]>();

  for (const doc of docs) {
    const list = byCategory.get(doc.category) ?? [];
    list.push(doc);
    byCategory.set(doc.category, list);
  }

  return [...byCategory.entries()].map(([category, documents]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    documents: documents.sort((a, b) => a.zipOrder - b.zipOrder),
  }));
}

export function isDocumentVisibleInChecklist(
  id: DocumentId,
  input: ProjectContext
): boolean {
  const def = getCatalogDocument(id);
  if (!def) return false;
  if (def.isoScope?.length) return false;
  if (def.showWhen && !def.showWhen(input)) return false;
  if (def.conditionalOn?.length) return false;
  return true;
}

export function resolveApiDocType(id: DocumentId): string {
  const legacy = DOCUMENT_ID_TO_LEGACY[id];
  return legacy ?? id;
}

export function buildZipFilename(id: DocumentId, safeSerial: string): string {
  const def = getCatalogDocument(id);
  const order = String(def?.zipOrder ?? 99).padStart(2, '0');
  const short = (def?.label.split('(')[0].trim() ?? id)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '')
    .slice(0, 36);
  return `${order}_${short}_${safeSerial}.docx`;
}

/** @deprecated Bruk getVisibleGroups */
export function getLegacyVisibleCatalog(input: ProjectContext): CatalogDocument[] {
  return getVisibleCatalog(input);
}
