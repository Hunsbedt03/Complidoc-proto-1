import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  TableLayoutType,
} from 'docx';
import type { MachineFields } from '@/lib/generators/machineFields';
import type { DocumentBlock } from '@/lib/document-model/types';
import { paragraphPlainText } from '@/lib/document-model/types';
import { structuredDataToBlocks } from '@/lib/document-model/structuredToBlocks';
import type { StructuredDocumentData } from '@/lib/document-model/types';
import { getDocTitle } from '@/lib/generators/constants';
import {
  contentWidthForDocument,
  isLandscapeDocument,
  tableColumnWidthsDxa,
} from '@/lib/document-model/tableLayout';
import { buildExportInfoRows } from '@/lib/document-model/exportMeta';

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_M = { top: 80, bottom: 80, left: 120, right: 120 };
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1134;

function pageProps(documentId?: string) {
  const landscape = isLandscapeDocument(documentId);
  return {
    page: {
      size: {
        width: PAGE_W,
        height: PAGE_H,
        ...(landscape ? { orientation: PageOrientation.LANDSCAPE } : {}),
      },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
  };
}

function contentWidth(documentId?: string) {
  return contentWidthForDocument(documentId);
}

function sanitizeText(text: unknown): string {
  if (text == null) return '—';
  return String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\uFFFE|\uFFFF/g, '');
}

function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun({
        text: sanitizeText(text),
        bold: true,
        size: 30,
        font: 'Arial',
        color: '1A3A5C',
      }),
    ],
  });
}

function h2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text: sanitizeText(text),
        bold: true,
        size: 24,
        font: 'Arial',
        color: '2B4C7E',
      }),
    ],
  });
}

function body(text: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: sanitizeText(text), size: 22, font: 'Arial' })],
  });
}

function blank() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 22 })] });
}

function cover(title: string, sub: string, meta: string) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 400 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 56,
          font: 'Arial',
          color: '1A3A5C',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: sub, size: 28, font: 'Arial', color: '4B5563' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800 },
      children: [new TextRun({ text: meta, size: 22, font: 'Arial', color: '6B7280' })],
    }),
  ];
}

function infoTable(rows: [string, string][], documentId?: string) {
  const cw = contentWidth(documentId);
  const c1 = Math.round(cw * 0.36);
  const c2 = cw - c1;
  return new Table({
    width: { size: cw, type: WidthType.DXA },
    columnWidths: [c1, c2],
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: BORDERS,
              width: { size: c1, type: WidthType.DXA },
              margins: CELL_M,
              shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: label, bold: true, size: 20, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: BORDERS,
              width: { size: c2, type: WidthType.DXA },
              margins: CELL_M,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value || '—',
                      size: 20,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function signatureTable(d: MachineFields, dato: string) {
  const cw = contentWidth();
  const c = Math.round(cw / 2);
  return new Table({
    width: { size: cw, type: WidthType.DXA },
    columnWidths: [c, c],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: BORDERS,
            width: { size: c, type: WidthType.DXA },
            margins: CELL_M,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Sted og dato / Place and date:',
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
              blank(),
              new Paragraph({
                children: [
                  new TextRun({ text: `Norge, ${dato}`, size: 20, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: BORDERS,
            width: { size: c, type: WidthType.DXA },
            margins: CELL_M,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Underskrift / Signature:',
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
              blank(),
              new Paragraph({
                children: [
                  new TextRun({ text: d.ingenior, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: d.produsent,
                    size: 18,
                    font: 'Arial',
                    color: '6B7280',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function paragraphFromBlock(block: Extract<DocumentBlock, { type: 'paragraph' }>) {
  if (block.spans?.length) {
    return new Paragraph({
      spacing: { after: 120 },
      children: block.spans.map(
        (s) =>
          new TextRun({
            text: sanitizeText(s.text),
            bold: s.bold,
            italics: s.italic,
            size: 22,
            font: 'Arial',
          })
      ),
    });
  }
  return body(paragraphPlainText(block));
}

function h3(text: string) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: sanitizeText(text),
        bold: true,
        size: 22,
        font: 'Arial',
      }),
    ],
  });
}

function makeDoc(children: (Paragraph | Table)[], documentId?: string) {
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 30, bold: true, font: 'Arial', color: '1A3A5C' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 24, bold: true, font: 'Arial', color: '2B4C7E' },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{ properties: pageProps(documentId), children }],
  });
}

function blocksToDocxNodes(blocks: DocumentBlock[], documentId?: string): (Paragraph | Table)[] {
  const cw = contentWidth(documentId);
  const nodes: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        if (block.level === 1) nodes.push(h1(block.text));
        else if (block.level === 2) nodes.push(h2(block.text));
        else nodes.push(h3(block.text));
        break;
      case 'paragraph':
        nodes.push(paragraphFromBlock(block));
        break;
      case 'list':
        for (const item of block.items) {
          nodes.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 60 },
              children: [
                new TextRun({ text: sanitizeText(item), size: 22, font: 'Arial' }),
              ],
            })
          );
        }
        break;
      case 'table': {
        const widths = tableColumnWidthsDxa(block.headers, documentId, cw);
        const headerRow = new TableRow({
          children: block.headers.map(
            (h, i) =>
              new TableCell({
                borders: BORDERS,
                width: { size: widths[i] ?? Math.round(cw / block.headers.length), type: WidthType.DXA },
                margins: CELL_M,
                shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: sanitizeText(h), bold: true, size: 18, font: 'Arial' }),
                    ],
                  }),
                ],
              })
          ),
        });
        const bodyRows = block.rows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell, i) =>
                  new TableCell({
                    borders: BORDERS,
                    width: { size: widths[i] ?? Math.round(cw / block.headers.length), type: WidthType.DXA },
                    margins: CELL_M,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: sanitizeText(cell),
                            size: 18,
                            font: 'Arial',
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            })
        );
        nodes.push(
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: cw, type: WidthType.DXA },
            columnWidths: widths,
            rows: [headerRow, ...bodyRows],
          })
        );
        break;
      }
      default:
        break;
    }
  }
  return nodes;
}

function parseMarkdown(text: string): (Paragraph | Table)[] {
  const nodes: (Paragraph | Table | null)[] = sanitizeText(text)
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const t = line.trim();
      if (/^\|[-:| ]+\|$/.test(t)) return null;
      if (t.startsWith('# ')) return h1(t.slice(2));
      if (t.startsWith('## ')) return h2(t.slice(3));
      if (t.startsWith('### '))
        return new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: sanitizeText(t.slice(4)),
              bold: true,
              size: 22,
              font: 'Arial',
            }),
          ],
        });
      if (
        t.startsWith('- ') ||
        t.startsWith('* ') ||
        t.startsWith('- [ ] ') ||
        t.startsWith('- [x] ')
      ) {
        const txt = t.replace(/^-\s\[[ x]\]\s?/, '').replace(/^[-*]\s/, '');
        return new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: sanitizeText(txt), size: 22, font: 'Arial' })],
        });
      }
      if (t.match(/^\d+\.\s/)) return body(t);
      if (t.startsWith('|'))
        return body(t.replace(/\|/g, ' · ').replace(/\s+/g, ' ').trim());
      return body(t);
    });
  return nodes.filter((x): x is Paragraph | Table => x != null);
}

function defaultInfoRows(d: MachineFields, docNr: string, dato: string): [string, string][] {
  return [
    ['Dokumentnummer', docNr],
    ['Maskin', d.maskin],
    ['Serienummer', d.serienr],
    ['Prosjekt', d.prosjekt],
    ['Produsent', d.produsent],
    ['Kunde', d.kunde],
    ['Ansvarlig', d.ingenior],
    ['Dato', dato],
  ];
}

export async function buildDocxBuffer(
  resolvedType: string,
  d: MachineFields,
  aiText: string,
  structured?: StructuredDocumentData | null
): Promise<Buffer> {
  const dato = new Date().toLocaleDateString('no-NO');
  const safeSerial = d.serienr.replace(/\s/g, '');
  let doc: Document;

  if (resolvedType === 'risk') {
    const docNr = `FS-RISK-${safeSerial}-Rev01`;
    doc = makeDoc([
      ...cover('Risikovurdering', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
      blank(),
      infoTable([
        ...defaultInfoRows(d, docNr, dato),
        ['Standard', 'EN ISO 12100:2010'],
      ]),
      blank(),
      ...parseMarkdown(aiText),
    ]);
  } else if (resolvedType === 'tech') {
    const docNr = `FS-TECH-${safeSerial}-Rev01`;
    doc = makeDoc([
      ...cover(
        'Teknisk konstruksjonsfil',
        `${d.maskin} · ${d.serienr}`,
        `${d.produsent} · ${dato}`
      ),
      blank(),
      infoTable([
        ...defaultInfoRows(d, docNr, dato),
        ['Drivsystem', d.drivsystem],
        ['Energikilde', d.energikilde],
        ['Installasjonsmiljø', d.installasjonsmiljo],
        ['Direktiv', 'Maskindirektivet 2006/42/EC'],
      ]),
      blank(),
      ...parseMarkdown(aiText),
    ]);
  } else if (resolvedType === 'doc') {
    doc = makeDoc([
      ...cover(
        'EF-Samsvarserklæring',
        'EC Declaration of Conformity',
        `${d.maskin} · ${d.serienr}`
      ),
      blank(),
      infoTable([
        ['Produsent / Manufacturer', d.produsent],
        ['Maskin / Machine', d.maskin],
        ['Serienummer / Serial no.', d.serienr],
        ['Prosjekt / Project', d.prosjekt],
        ['Primært direktiv', 'Maskindirektivet 2006/42/EC'],
        ['Dato / Date', dato],
      ]),
      blank(),
      ...parseMarkdown(aiText),
      blank(),
      signatureTable(d, dato),
    ]);
  } else if (resolvedType === 'qc') {
    const docNr = `FS-QC-${safeSerial}-Rev01`;
    doc = makeDoc([
      ...cover('QC-Sjekkliste', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
      blank(),
      infoTable(defaultInfoRows(d, docNr, dato)),
      blank(),
      ...parseMarkdown(aiText),
    ]);
  } else {
    const title = getDocTitle(resolvedType);
    const prefix = resolvedType.slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DOC';
    const docNr = `FS-${prefix}-${safeSerial}-Rev01`;
    const contentNodes = structured
      ? blocksToDocxNodes(structuredDataToBlocks(structured), resolvedType)
      : parseMarkdown(aiText);
    doc = makeDoc(
      [
        ...cover(title, `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
        blank(),
        infoTable(defaultInfoRows(d, docNr, dato)),
        blank(),
        ...contentNodes,
      ],
      resolvedType
    );
  }

  return Packer.toBuffer(doc);
}

export async function buildDocxFromBlocks(
  title: string,
  meta: {
    project: string;
    machine: string;
    revision: number;
    date: string;
    produsent?: string;
    serienr?: string;
    kunde?: string;
    ingenior?: string;
    documentId?: string;
  },
  blocks: DocumentBlock[]
): Promise<Buffer> {
  const dato = meta.date;
  const produsent = meta.produsent ?? '—';
  const infoRows = buildExportInfoRows({
    title,
    project: meta.project,
    machine: meta.machine,
    revision: meta.revision,
    date: dato,
    produsent,
    serienr: meta.serienr,
    kunde: meta.kunde,
    ingenior: meta.ingenior,
    documentId: meta.documentId,
  });

  const doc = makeDoc(
    [
      ...cover(title, `${meta.machine} · ${meta.project}`, `${produsent} · ${dato}`),
      blank(),
      infoTable(infoRows, meta.documentId),
      blank(),
      ...blocksToDocxNodes(blocks, meta.documentId),
    ],
    meta.documentId
  );
  return Packer.toBuffer(doc);
}
