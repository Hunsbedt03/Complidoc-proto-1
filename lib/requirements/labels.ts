import { getCatalogDocument } from '@/lib/documents/catalog';
import { ALL_DOCUMENTS } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import type { DocumentOption } from '@/lib/requirements/types';

export function requirementDocumentLabel(documentId: string): string {
  return getCatalogDocument(documentId as DocumentId)?.label ?? documentId;
}

export function requirementDocumentOptions(): DocumentOption[] {
  return [...ALL_DOCUMENTS]
    .map((d) => ({ id: d.id, label: d.label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nb'));
}
