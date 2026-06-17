import type { DocumentBlock } from '@/lib/document-model/types';
import { normalizeToBlocks } from '@/lib/document-model/normalizeToBlocks';
import { blocksToHtml, blocksToTiptap } from '@/lib/document-model/blocksToTiptap';

export type EditorContentInput = {
  documentId: string;
  content?: string | null;
  contentJson?: string | null;
  structuredData?: string | null;
};

function parseStructured(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as import('@/lib/document-model/types').StructuredDocumentData;
  } catch {
    return null;
  }
}

/**
 * Normaliserer lagret revisjonsinnhold til HTML + Tiptap JSON for editor/preview.
 * Markdown konverteres én gang ved visning; ved lagring blir Tiptap JSON persistert.
 */
export function contentForEditor(input: EditorContentInput): {
  html: string;
  contentJson: string;
  blocks: DocumentBlock[];
} {
  const structured = parseStructured(input.structuredData ?? undefined);

  const parsedJson = (() => {
    if (!input.contentJson?.trim()) return undefined;
    try {
      return JSON.parse(input.contentJson) as unknown;
    } catch {
      return undefined;
    }
  })();

  const isTiptap =
    parsedJson &&
    typeof parsedJson === 'object' &&
    (parsedJson as { type?: string }).type === 'doc' &&
    Array.isArray((parsedJson as { content?: unknown[] }).content) &&
    ((parsedJson as { content: unknown[] }).content?.length ?? 0) > 0;

  if (isTiptap && !structured) {
    return {
      html: input.content?.trim() || blocksToHtml(normalizeToBlocks({
        documentId: input.documentId,
        contentJson: parsedJson,
        contentHtml: input.content,
        structuredData: structured,
      })),
      contentJson: input.contentJson!,
      blocks: normalizeToBlocks({
        documentId: input.documentId,
        contentJson: parsedJson,
        contentHtml: input.content,
        structuredData: structured,
      }),
    };
  }

  const blocks = normalizeToBlocks({
    documentId: input.documentId,
    structuredData: structured,
    contentJson: parsedJson,
    contentHtml: input.content,
  });

  const tiptap = blocksToTiptap(blocks);
  return {
    html: blocksToHtml(blocks),
    contentJson: JSON.stringify(tiptap),
    blocks,
  };
}
