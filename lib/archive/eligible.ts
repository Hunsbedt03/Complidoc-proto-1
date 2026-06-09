import { ALL_DOCUMENTS } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import type { CatalogDocument } from '@/lib/documents/types';

/** Dokumenttyper som hører på bedriftsnivå (ikke maskinspesifikke). */
export function isArchiveEligible(doc: CatalogDocument): boolean {
  if (doc.sourceType === 'ai_generated') return false;
  if (doc.isoScope?.length) return true;
  return false;
}

export function getArchiveEligibleDocuments(): CatalogDocument[] {
  return ALL_DOCUMENTS.filter(isArchiveEligible).sort((a, b) =>
    a.label.localeCompare(b.label, 'nb')
  );
}

export function getArchiveEligibleIds(): DocumentId[] {
  return getArchiveEligibleDocuments().map((d) => d.id);
}

export function isArchiveEligibleId(documentTypeId: string): boolean {
  const doc = ALL_DOCUMENTS.find((d) => d.id === documentTypeId);
  return doc ? isArchiveEligible(doc) : false;
}
