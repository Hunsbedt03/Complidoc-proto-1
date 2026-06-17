import type { DocumentBlock, InlineSpan } from '@/lib/document-model/types';

export { blocksToHtml } from '@/lib/document-model/renderBlocksHtml';

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: { type: string }[];
  content?: TiptapNode[];
};

function textNode(text: string, marks?: { type: string }[]): TiptapNode {
  const node: TiptapNode = { type: 'text', text };
  if (marks?.length) node.marks = marks;
  return node;
}

function spansToTiptapContent(spans: InlineSpan[]): TiptapNode[] {
  return spans
    .filter((s) => s.text)
    .map((s) => {
      const marks: { type: string }[] = [];
      if (s.bold) marks.push({ type: 'bold' });
      if (s.italic) marks.push({ type: 'italic' });
      return textNode(s.text, marks.length ? marks : undefined);
    });
}

function paragraphFromBlock(block: Extract<DocumentBlock, { type: 'paragraph' }>): TiptapNode {
  const content = block.spans?.length
    ? spansToTiptapContent(block.spans)
    : block.text
      ? [textNode(block.text)]
      : [];
  return { type: 'paragraph', content };
}

function tableNode(headers: string[], rows: string[][]): TiptapNode {
  const headerRow: TiptapNode = {
    type: 'tableRow',
    content: headers.map((h) => ({
      type: 'tableHeader',
      content: [paragraphFromBlock({ type: 'paragraph', text: h })],
    })),
  };

  const bodyRows: TiptapNode[] = rows.map((row) => ({
    type: 'tableRow',
    content: row.map((cell) => ({
      type: 'tableCell',
      content: [paragraphFromBlock({ type: 'paragraph', text: cell })],
    })),
  }));

  return {
    type: 'table',
    content: [headerRow, ...bodyRows],
  };
}

/** Konverterer DocumentBlock[] til Tiptap JSON-dokument. */
export function blocksToTiptap(blocks: DocumentBlock[]): {
  type: 'doc';
  content: TiptapNode[];
} {
  const content: TiptapNode[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        content.push({
          type: 'heading',
          attrs: { level: block.level },
          content: block.text ? [textNode(block.text)] : [],
        });
        break;
      case 'paragraph':
        content.push(paragraphFromBlock(block));
        break;
      case 'list':
        content.push({
          type: block.ordered ? 'orderedList' : 'bulletList',
          content: block.items.map((item) => ({
            type: 'listItem',
            content: [paragraphFromBlock({ type: 'paragraph', text: item })],
          })),
        });
        break;
      case 'table':
        content.push(tableNode(block.headers, block.rows));
        break;
      default:
        break;
    }
  }

  return { type: 'doc', content };
}
