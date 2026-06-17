import type { DocumentBlock, InlineSpan } from '@/lib/document-model/types';
import { looksLikeMarkdown, markdownToBlocks } from '@/lib/document-model/markdownToBlocks';

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlToMarkdownish(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/h1>/gi, '\n\n')
      .replace(/<\/h2>/gi, '\n\n')
      .replace(/<\/h3>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseTableHtml(tableHtml: string): DocumentBlock | null {
  const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  const bodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const section = (headerMatch?.[1] ?? '') + (bodyMatch?.[1] ?? tableHtml);

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<t([hd])[^>]*>([\s\S]*?)<\/t\1>/gi;

  const headers: string[] = [];
  const rows: string[][] = [];
  let rowMatch: RegExpExecArray | null;
  let headerDone = false;

  while ((rowMatch = rowRegex.exec(section)) !== null) {
    const cells: string[] = [];
    let hasTh = false;
    let cellMatch: RegExpExecArray | null;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      if (cellMatch[1].toLowerCase() === 'h') hasTh = true;
      cells.push(stripHtmlToMarkdownish(cellMatch[2]));
    }
    if (!cells.length) continue;
    if (!headerDone && hasTh) {
      headers.push(...cells);
      headerDone = true;
    } else {
      rows.push(cells);
    }
  }

  if (!headers.length && rows.length) {
    return { type: 'table', headers: rows[0], rows: rows.slice(1) };
  }
  if (!headers.length) return null;
  return { type: 'table', headers, rows };
}

function spansFromHtmlInline(html: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const parts = html.split(/(<\/?(?:strong|b|em|i)[^>]*>)/gi);
  let bold = false;
  let italic = false;
  for (const part of parts) {
    if (/^<(strong|b)/i.test(part)) {
      bold = true;
      continue;
    }
    if (/^<\/(strong|b)/i.test(part)) {
      bold = false;
      continue;
    }
    if (/^<(em|i)/i.test(part)) {
      italic = true;
      continue;
    }
    if (/^<\/(em|i)/i.test(part)) {
      italic = false;
      continue;
    }
    const text = stripHtmlToMarkdownish(part);
    if (text) spans.push({ text, bold: bold || undefined, italic: italic || undefined });
  }
  return spans.length ? spans : [{ text: stripHtmlToMarkdownish(html) }];
}

/** Parser enkel HTML til DocumentBlock[] (fallback etter structured/Tiptap/Markdown). */
export function htmlToBlocks(html: string): DocumentBlock[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  if (looksLikeMarkdown(trimmed)) {
    const md = trimmed.startsWith('<') ? stripHtmlToMarkdownish(trimmed) : trimmed;
    const fromMd = markdownToBlocks(md);
    if (fromMd.length) return fromMd;
  }

  const blocks: DocumentBlock[] = [];
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let lastIndex = 0;
  let tableMatch: RegExpExecArray | null;

  const pushSegment = (segment: string) => {
    if (!segment.trim()) return;
    const heading = segment.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: Number(heading[1]) as 1 | 2 | 3,
        text: stripHtmlToMarkdownish(heading[2]),
      });
      return;
    }
    const listMatch = segment.match(/^<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i);
    if (listMatch) {
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRegex.exec(listMatch[2])) !== null) {
        items.push(stripHtmlToMarkdownish(li[1]));
      }
      blocks.push({ type: 'list', ordered: listMatch[1] === 'ol', items });
      return;
    }
    const pMatch = segment.match(/^<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const spans = spansFromHtmlInline(pMatch[1]);
      const text = spans.map((s) => s.text).join('');
      blocks.push(
        spans.some((s) => s.bold || s.italic)
          ? { type: 'paragraph', text, spans }
          : { type: 'paragraph', text }
      );
      return;
    }
    const plain = stripHtmlToMarkdownish(segment);
    if (plain) blocks.push({ type: 'paragraph', text: plain });
  };

  while ((tableMatch = tableRegex.exec(trimmed)) !== null) {
    pushSegment(trimmed.slice(lastIndex, tableMatch.index));
    const tableBlock = parseTableHtml(tableMatch[0]);
    if (tableBlock) blocks.push(tableBlock);
    lastIndex = tableMatch.index + tableMatch[0].length;
  }
  pushSegment(trimmed.slice(lastIndex));

  return blocks;
}

/** Placeholder fra gammel seed — kan ikke parses til ekte innhold. */
export function isPlaceholderRevisionContent(content: string): boolean {
  const t = content.trim();
  return (
    t.includes('AI-generert dokument. Rediger for å tilpasse') ||
    (t.includes('AI-regenerert') && t.length < 280)
  );
}
