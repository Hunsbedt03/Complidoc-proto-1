import { marked, type Token, type Tokens } from 'marked';
import type { DocumentBlock, InlineSpan } from '@/lib/document-model/types';
import { paragraphPlainText } from '@/lib/document-model/types';

marked.setOptions({ gfm: true, breaks: false });

function inlineSpans(tokens: Token[] | undefined): InlineSpan[] {
  if (!tokens?.length) return [];
  const spans: InlineSpan[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        spans.push({ text: (t as Tokens.Text).text });
        break;
      case 'strong':
        spans.push({
          text: (t as Tokens.Strong).text,
          bold: true,
        });
        break;
      case 'em':
        spans.push({
          text: (t as Tokens.Em).text,
          italic: true,
        });
        break;
      case 'del':
        spans.push({ text: (t as Tokens.Del).text });
        break;
      case 'escape':
        spans.push({ text: (t as Tokens.Escape).text });
        break;
      case 'codespan':
        spans.push({ text: (t as Tokens.Codespan).text });
        break;
      case 'link':
        spans.push({ text: (t as Tokens.Link).text });
        break;
      default:
        if ('text' in t && typeof t.text === 'string') {
          spans.push({ text: t.text });
        } else if ('raw' in t && typeof t.raw === 'string') {
          spans.push({ text: t.raw });
        }
        break;
    }
  }
  return spans;
}

function paragraphBlock(tokens: Token[] | undefined, fallbackRaw?: string): DocumentBlock {
  const spans = inlineSpans(tokens);
  const text = spans.length
    ? spans.map((s) => s.text).join('')
    : (fallbackRaw ?? '').trim();
  if (spans.some((s) => s.bold || s.italic)) {
    return { type: 'paragraph', text, spans };
  }
  return { type: 'paragraph', text };
}

function listItems(listToken: Tokens.List): string[] {
  return listToken.items.map((item) => {
    const spans = inlineSpans(item.tokens);
    if (spans.length) return spans.map((s) => s.text).join('');
    return item.text.trim();
  });
}

/** Konverterer Markdown-streng til DocumentBlock[] via marked (GFM-tabeller støttet). */
export function markdownToBlocks(markdown: string): DocumentBlock[] {
  const source = markdown.trim();
  if (!source) return [];

  const tokens = marked.lexer(source);
  const blocks: DocumentBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const h = token as Tokens.Heading;
        const level = Math.min(3, Math.max(1, h.depth)) as 1 | 2 | 3;
        blocks.push({ type: 'heading', level, text: h.text.trim() });
        break;
      }
      case 'paragraph':
        blocks.push(paragraphBlock((token as Tokens.Paragraph).tokens, token.raw));
        break;
      case 'list': {
        const list = token as Tokens.List;
        blocks.push({
          type: 'list',
          ordered: list.ordered,
          items: listItems(list).filter(Boolean),
        });
        break;
      }
      case 'table': {
        const table = token as Tokens.Table;
        const headers = table.header.map((cell) => cell.text.trim());
        const rows = table.rows.map((row) => row.map((cell) => cell.text.trim()));
        if (headers.length) {
          blocks.push({ type: 'table', headers, rows });
        }
        break;
      }
      case 'blockquote': {
        const q = token as Tokens.Blockquote;
        for (const inner of q.tokens) {
          if (inner.type === 'paragraph') {
            blocks.push(paragraphBlock((inner as Tokens.Paragraph).tokens));
          }
        }
        break;
      }
      case 'code': {
        const c = token as Tokens.Code;
        blocks.push({ type: 'paragraph', text: c.text });
        break;
      }
      case 'hr':
        break;
      case 'space':
        break;
      default:
        if ('text' in token && typeof token.text === 'string' && token.text.trim()) {
          blocks.push({ type: 'paragraph', text: token.text.trim() });
        }
        break;
    }
  }

  return blocks.filter((b) => {
    if (b.type === 'paragraph') return paragraphPlainText(b).trim().length > 0;
    if (b.type === 'list') return b.items.length > 0;
    if (b.type === 'table') return b.headers.length > 0;
    return true;
  });
}

/** Heuristikk: er strengen sannsynligvis Markdown (ikke ferdig HTML)? */
export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const withoutTags = t.replace(/<[^>]+>/g, '\n').trim();
  const probe = withoutTags || t;

  if (/^#{1,3}\s/m.test(probe)) return true;
  if (/^\s*[-*+]\s+/m.test(probe)) return true;
  if (/^\s*\d+\.\s+/m.test(probe)) return true;
  if (/^\|.+\|$/m.test(probe)) return true;
  if (/\*\*[^*\n]+\*\*/.test(probe)) return true;
  if (/^>\s/m.test(probe)) return true;

  if (t.startsWith('<') && /<\/(p|div|span)>/i.test(t) && !/<table/i.test(t)) {
    return looksLikeMarkdown(withoutTags);
  }

  return false;
}
