import type { StructuredDocumentData } from '@/lib/document-model/types';
import { normalizeToBlocks } from '@/lib/document-model/normalizeToBlocks';
import type { DocumentBlock } from '@/lib/document-model/types';

/** Bygger DocumentBlock[] fra revisjonsdata (structured_data prioriteres alltid først). */
export function revisionToBlocks(input: {
  contentJson?: unknown;
  structuredData?: StructuredDocumentData | null;
  documentId: string;
  contentHtml?: string | null;
}): DocumentBlock[] {
  return normalizeToBlocks({
    documentId: input.documentId,
    structuredData: input.structuredData,
    contentJson: input.contentJson,
    contentHtml: input.contentHtml,
  });
}
