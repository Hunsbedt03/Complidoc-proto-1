import type { DocumentBlock, InlineSpan } from '@/lib/document-model/types';
import { paragraphPlainText } from '@/lib/document-model/types';

import { tableColumnWidthRatios } from '@/lib/document-model/tableLayout';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function spansToHtml(spans: InlineSpan[]): string {
  return spans
    .map((s) => {
      let t = escapeHtml(s.text);
      if (s.bold) t = `<strong>${t}</strong>`;
      if (s.italic) t = `<em>${t}</em>`;
      return t;
    })
    .join('');
}

export function blocksToPreviewHtml(
  blocks: DocumentBlock[],
  options?: { tableClass?: string; documentId?: string }
): string {
  const tableClass = options?.tableClass ?? 'doc-paper-table';
  const documentId = options?.documentId;
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        parts.push(`<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`);
        break;
      case 'paragraph': {
        const inner = block.spans?.length
          ? spansToHtml(block.spans)
          : escapeHtml(paragraphPlainText(block));
        parts.push(`<p>${inner}</p>`);
        break;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('');
        parts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case 'table': {
        const ratios = tableColumnWidthRatios(block.headers, documentId);
        const colgroup = `<colgroup>${ratios
          .map((r) => `<col style="width:${r}%" />`)
          .join('')}</colgroup>`;
        const head = `<tr>${block.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
        const body = block.rows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
          )
          .join('');
        parts.push(
          `<table class="${tableClass}">${colgroup}<thead>${head}</thead><tbody>${body}</tbody></table>`
        );
        break;
      }
      default:
        break;
    }
  }
  return parts.join('\n');
}

export function blocksToHtml(blocks: DocumentBlock[]): string {
  return blocksToPreviewHtml(blocks, { tableClass: '' }).replace(
    /<table class="">/g,
    '<table>'
  );
}
