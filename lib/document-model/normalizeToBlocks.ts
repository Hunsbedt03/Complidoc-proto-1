import type { StructuredDocumentData } from '@/lib/document-model/types';
import { isStructuredTableDocumentId } from '@/lib/document-model/types';
import { structuredDataToBlocks } from '@/lib/document-model/structuredToBlocks';
import { tiptapToBlocks } from '@/lib/document-model/tiptapToBlocks';
import { markdownToBlocks, looksLikeMarkdown } from '@/lib/document-model/markdownToBlocks';
import { htmlToBlocks, isPlaceholderRevisionContent } from '@/lib/document-model/htmlToBlocks';
import type { DocumentBlock } from '@/lib/document-model/types';

export type NormalizeInput = {
  documentId: string;
  structuredData?: StructuredDocumentData | null;
  contentJson?: unknown;
  contentHtml?: string | null;
};

function parseContentJson(contentJson: unknown): unknown | null {
  if (contentJson == null) return null;
  if (typeof contentJson === 'string') {
    if (!contentJson.trim()) return null;
    try {
      return JSON.parse(contentJson) as unknown;
    } catch {
      return null;
    }
  }
  return contentJson;
}

function isNonEmptyTiptapDoc(doc: unknown): doc is { type: 'doc'; content: unknown[] } {
  return (
    !!doc &&
    typeof doc === 'object' &&
    (doc as { type?: string }).type === 'doc' &&
    Array.isArray((doc as { content?: unknown[] }).content) &&
    ((doc as { content: unknown[] }).content?.length ?? 0) > 0
  );
}

/**
 * Format-bevisst normalisering til DocumentBlock[].
 * Prioritet (VIKTIG — structured_data ALLTID først):
 * 1. structured_data → structuredToBlocks
 * 2. Tiptap JSON → tiptapToBlocks
 * 3. Markdown → markdownToBlocks
 * 4. HTML → htmlToBlocks
 */
export function normalizeToBlocks(input: NormalizeInput): DocumentBlock[] {
  const { documentId, structuredData, contentHtml } = input;

  // 1. structured_data — tabell-typer skal ALDRI via Markdown
  if (
    structuredData &&
    isStructuredTableDocumentId(documentId) &&
    structuredData.kind === documentId
  ) {
    return structuredDataToBlocks(structuredData);
  }

  const parsedJson = parseContentJson(input.contentJson);

  // 2. Tiptap JSON
  if (isNonEmptyTiptapDoc(parsedJson)) {
    const fromTiptap = tiptapToBlocks(parsedJson);
    if (fromTiptap.length > 0) return fromTiptap;
  }

  const raw = (contentHtml ?? '').trim();
  if (!raw) return [];

  if (isPlaceholderRevisionContent(raw)) {
    return [];
  }

  // 3. Markdown (rå tekst eller Markdown pakket inn i enkle HTML-tagger)
  if (looksLikeMarkdown(raw)) {
    const mdSource = raw.startsWith('<')
      ? raw
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .trim()
      : raw;
    const fromMd = markdownToBlocks(mdSource);
    if (fromMd.length > 0) return fromMd;
  }

  // 4. HTML
  const fromHtml = htmlToBlocks(raw);
  if (fromHtml.length > 0) return fromHtml;

  return [{ type: 'paragraph', text: raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }];
}

export { isPlaceholderRevisionContent };
