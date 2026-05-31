import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType
} from 'https://esm.sh/docx@9.0.2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };
const PAGE_W = 11906;
const MARGIN = 1134;
const CONTENT_W = PAGE_W - MARGIN * 2;

function pageProps() {
  return { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } };
}

function heading1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true, size: 28, font: 'Arial' })] });
}
function heading2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size: 24, font: 'Arial' })] });
}
function body(text, options = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22, font: 'Arial', ...options })] });
}
function emptyLine() {
  return new Paragraph({ children: [new TextRun('')] });
}

function infoTable(rows) {
  const col1 = Math.round(CONTENT_W * 0.35);
  const col2 = CONTENT_W - col1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1, col2],
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders: BORDERS, width: { size: col1, type: WidthType.DXA }, margins: CELL_MARGINS,
          shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Arial' })] })]
        }),
        new TableCell({
          borders: BORDERS, width: { size: col2, type: WidthType.DXA }, margins: CELL_MARGINS,
          children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 20, font: 'Arial' })] })]
        })
      ]
    }))
  });
}

function coverTable(title, subtitle, date) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 400 }, children: [new TextRun({ text: title, bold: true, size: 52, font: 'Arial', color: '1A3A5C' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: subtitle, size: 28, font: 'Arial', color: '4B5563' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2000 }, children: [new TextRun({ text: date, size: 22, font: 'Arial', color: '6B7280' })] })
  ];
}

function aiParagraphs(aiContent) {
  return aiContent.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# ')) return heading1(t.slice(2));
    if (t.startsWith('## ')) return heading2(t.slice(3));
    if (t.startsWith('### ')) return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t.slice(4), bold: true, size: 22, font: 'Arial' })] });
    if (t.startsWith('- ') || t.startsWith('* ')) return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t.slice(2), size: 22, font: 'Arial' })] });
    return body(t);
  });
}

function makeDoc(sections) {
  return new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections
  });
}

export function parseMachineData(raw) {
  const get = (key) => {
    const m = raw.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : '—';
  };
  return {
    maskin: get('Maskin'), produsent: get('Produsent'), serienr: get('Serienummer'),
    prosjekt: get('Prosjekt/lokasjon'), kunde: get('Kunde'), ingenior: get('Ansvarlig ingeniør'),
    driv: get('Drivsystem'), spenning: get('Spenningsforsyning'), miljo: get('Installasjonsmiljø'),
    transport: get('Transport'), styring: get('Styring'), beskrivelse: get('Beskrivelse')
  };
}

function buildDoc(type, d, aiContent) {
  const dato = new Date().toLocaleDateString('no-NO');
  const paras = aiParagraphs(aiContent);
  const sn = d.serienr.replace(/\s/g, '');

  if (type === 'risk') {
    return makeDoc([{ properties: pageProps(), children: [
      ...coverTable('Risikovurdering', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
      infoTable([['Dokumentnummer', `FS-RISK-${sn}-Rev01`], ['Maskin / utstyr', d.maskin], ['Serienummer', d.serienr], ['Prosjekt / lokasjon', d.prosjekt], ['Produsent', d.produsent], ['Kunde', d.kunde], ['Ansvarlig ingeniør', d.ingenior], ['Dato', dato], ['Standard', 'EN ISO 12100:2010']]),
      emptyLine(), ...paras
    ]}]);
  }
  if (type === 'tech') {
    return makeDoc([{ properties: pageProps(), children: [
      ...coverTable('Teknisk Fil', `${d.maskin} · ${d.serienr}`, `${d.produsent} · ${dato}`),
      infoTable([['Dokumentnummer', `FS-TECH-${sn}-Rev01`], ['Maskin', d.maskin], ['Serienummer', d.serienr], ['Produsent', d.produsent], ['Dato', dato]]),
      emptyLine(), ...paras
    ]}]);
  }
  if (type === 'doc') {
    return makeDoc([{ properties: pageProps(), children: [
      ...coverTable('EF-Samsvarserklæring', 'EC Declaration of Conformity', `${d.maskin} · ${d.serienr}`),
      infoTable([['Produsent', d.produsent], ['Maskin', d.maskin], ['Serienummer', d.serienr], ['Dato', dato]]),
      emptyLine(), ...paras
    ]}]);
  }
  return makeDoc([{ properties: pageProps(), children: [
    ...coverTable('QC-Sjekkliste', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
    infoTable([['Dokumentnummer', `FS-QC-${sn}-Rev01`], ['Maskin', d.maskin], ['Serienummer', d.serienr], ['Dato', dato]]),
    emptyLine(), ...paras
  ]}]);
}

const FILE_NAMES = {
  risk: (d) => `01_Risikovurdering_${d.serienr.replace(/\s/g, '-')}.docx`,
  tech: (d) => `02_Teknisk_Fil_${d.serienr.replace(/\s/g, '-')}.docx`,
  doc: (d) => `03_Samsvarserklaring_${d.serienr.replace(/\s/g, '-')}.docx`,
  qc: (d) => `04_QC_Sjekkliste_${d.serienr.replace(/\s/g, '-')}.docx`
};

export async function buildDocxBlob(type, machineData, aiContent) {
  const d = parseMachineData(machineData);
  const doc = buildDoc(type, d, aiContent);
  return Packer.toBlob(doc);
}

export async function buildZipBlob(generatedDocs, machineData) {
  const d = parseMachineData(machineData);
  const zip = new JSZip();
  const folder = zip.folder(`Complidoc_${d.serienr.replace(/[^a-zA-Z0-9]/g, '_')}`);
  const types = ['risk', 'tech', 'doc', 'qc'];

  for (const type of types) {
    const blob = await buildDocxBlob(type, machineData, generatedDocs[type]);
    const buf = await blob.arrayBuffer();
    folder.file(FILE_NAMES[type](d), buf);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function getDocxFilename(type, machineData) {
  const d = parseMachineData(machineData);
  return FILE_NAMES[type](d);
}

