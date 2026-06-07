import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import { DOCUMENT_ID_TO_LEGACY } from './ids';
import type { CatalogDocument } from './catalog';
import { getCatalogDocument, getVisibleCatalog } from './catalog';
import type { ProjectInput } from './suggest';

export type DocumentDefinition = CatalogDocument;

export function getAllDocumentDefinitions(): CatalogDocument[] {
  return getVisibleCatalog({});
}

export function getDocumentDefinition(id: DocumentId): CatalogDocument | undefined {
  return getCatalogDocument(id);
}

export function getDefaultSelectedDocuments(): DocumentId[] {
  return [...CORE_DOCUMENT_IDS];
}

export function getVisibleGroups(input: ProjectInput): never[] {
  return [];
}

export function isDocumentVisibleInChecklist(
  id: DocumentId,
  input: ProjectInput
): boolean {
  const def = getCatalogDocument(id);
  if (!def) return false;
  if (def.showWhen && !def.showWhen(input)) return false;
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
