import type { DocumentBlock } from '@/lib/document-model/types';

type TiptapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: TiptapNode[];
};

function extractText(node: TiptapNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';
  return node.content.map(extractText).join('');
}

function listItems(listNode: TiptapNode): string[] {
  const items: string[] = [];
  for (const child of listNode.content ?? []) {
    if (child.type === 'listItem') {
      items.push(extractText(child).trim());
    }
  }
  return items.filter(Boolean);
}

function tableFromTiptap(tableNode: TiptapNode): DocumentBlock {
  const headers: string[] = [];
  const rows: string[][] = [];
  let headerDone = false;

  for (const rowNode of tableNode.content ?? []) {
    if (rowNode.type !== 'tableRow') continue;
    const cells = (rowNode.content ?? []).map((cell) => extractText(cell).trim());
    const hasHeaderCell = (rowNode.content ?? []).some(
      (c) => c.type === 'tableHeader'
    );
    if (!headerDone && hasHeaderCell) {
      headers.push(...cells);
      headerDone = true;
    } else {
      rows.push(cells);
    }
  }

  if (!headerDone && rows.length > 0) {
    return { type: 'table', headers: rows[0], rows: rows.slice(1) };
  }

  return { type: 'table', headers, rows };
}

function nodeToBlocks(node: TiptapNode): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  if (!node.content) return blocks;

  for (const child of node.content) {
    switch (child.type) {
      case 'heading': {
        const level = (child.attrs?.level as 1 | 2 | 3) ?? 2;
        const text = extractText(child).trim();
        if (text) blocks.push({ type: 'heading', level, text });
        break;
      }
      case 'paragraph': {
        const text = extractText(child).trim();
        if (text) blocks.push({ type: 'paragraph', text });
        break;
      }
      case 'bulletList':
        blocks.push({ type: 'list', ordered: false, items: listItems(child) });
        break;
      case 'orderedList':
        blocks.push({ type: 'list', ordered: true, items: listItems(child) });
        break;
      case 'table':
        blocks.push(tableFromTiptap(child));
        break;
      default:
        break;
    }
  }

  return blocks;
}

/** Konverterer Tiptap JSON til DocumentBlock[]. */
export function tiptapToBlocks(tiptapJson: unknown): DocumentBlock[] {
  if (!tiptapJson || typeof tiptapJson !== 'object') return [];
  const doc = tiptapJson as TiptapNode;
  if (doc.type !== 'doc') return [];
  return nodeToBlocks(doc);
}
