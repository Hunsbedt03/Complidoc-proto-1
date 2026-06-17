import type { DocumentBlock } from '@/lib/document-model/types';

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: TiptapNode[];
};

function textNode(text: string): TiptapNode {
  return { type: 'text', text };
}

function paragraph(text: string): TiptapNode {
  return {
    type: 'paragraph',
    content: text ? [textNode(text)] : [],
  };
}

function tableNode(headers: string[], rows: string[][]): TiptapNode {
  const headerRow: TiptapNode = {
    type: 'tableRow',
    content: headers.map((h) => ({
      type: 'tableHeader',
      content: [paragraph(h)],
    })),
  };

  const bodyRows: TiptapNode[] = rows.map((row) => ({
    type: 'tableRow',
    content: row.map((cell) => ({
      type: 'tableCell',
      content: [paragraph(cell)],
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
        content.push(paragraph(block.text));
        break;
      case 'list':
        content.push({
          type: block.ordered ? 'orderedList' : 'bulletList',
          content: block.items.map((item) => ({
            type: 'listItem',
            content: [paragraph(item)],
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

/** Enkel HTML-representasjon for revisjons-lagring uten editor. */
export function blocksToHtml(blocks: DocumentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        parts.push(`<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`);
        break;
      case 'paragraph':
        parts.push(`<p>${escapeHtml(block.text)}</p>`);
        break;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('');
        parts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case 'table': {
        const head = `<tr>${block.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
        const body = block.rows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
          )
          .join('');
        parts.push(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
        break;
      }
      default:
        break;
    }
  }
  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
