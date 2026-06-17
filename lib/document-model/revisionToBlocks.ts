import type { StructuredDocumentData } from '@/lib/document-model/types';
import { isStructuredTableDocumentId } from '@/lib/document-model/types';
import { structuredDataToBlocks } from '@/lib/document-model/structuredToBlocks';
import { tiptapToBlocks } from '@/lib/document-model/tiptapToBlocks';
import type { DocumentBlock } from '@/lib/document-model/types';

/** Bygger DocumentBlock[] fra revisjonsdata (structured prioriteres for tabell-typer). */
export function revisionToBlocks(input: {
  contentJson?: unknown;
  structuredData?: StructuredDocumentData | null;
  documentId: string;
}): DocumentBlock[] {
  const { structuredData, contentJson, documentId } = input;

  if (
    structuredData &&
    isStructuredTableDocumentId(documentId) &&
    structuredData.kind === documentId
  ) {
    return structuredDataToBlocks(structuredData);
  }

  if (contentJson) {
    const fromTiptap = tiptapToBlocks(contentJson);
    if (fromTiptap.length > 0) return fromTiptap;
  }

  return [];
}
