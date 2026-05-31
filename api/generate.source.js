const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType
} = require('docx');
const JSZip = require('jszip');

// ─── Konstanter ─────────────────────────────────────────────────────────────
const BORDER    = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS   = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_M    = { top: 80, bottom: 80, left: 120, right: 120 };
const PAGE_W    = 11906;
const PAGE_H    = 16838;
const MARGIN    = 1134;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9638

function pageProps() {
  return { page: { size: { width: PAGE_W, height: PAGE_H },
    margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } };
}

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 30, font: 'Arial', color: '1A3A5C' })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: '2B4C7E' })] });
}
function body(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })] });
}
function blank() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 22 })] });
}

function cover(title, sub, meta) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 400 },
      children: [new TextRun({ text: title, bold: true, size: 56, font: 'Arial', color: '1A3A5C' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: sub, size: 28, font: 'Arial', color: '4B5563' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1800 },
      children: [new TextRun({ text: meta, size: 22, font: 'Arial', color: '6B7280' })] }),
  ];
}

function infoTable(rows) {
  const c1 = Math.round(CONTENT_W * 0.36);
  const c2 = CONTENT_W - c1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [c1, c2],
    rows: rows.map(([label, value]) => new TableRow({ children: [
      new TableCell({ borders: BORDERS, width: { size: c1, type: WidthType.DXA }, margins: CELL_M,
        shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Arial' })] })] }),
      new TableCell({ borders: BORDERS, width: { size: c2, type: WidthType.DXA }, margins: CELL_M,
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 20, font: 'Arial' })] })] })
    ]}))
  });
}

function signatureTable(d, dato) {
  const c = Math.round(CONTENT_W / 2);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [c, c],
    rows: [new TableRow({ children: [
      new TableCell({ borders: BORDERS, width: { size: c, type: WidthType.DXA }, margins: CELL_M,
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Sted og dato / Place and date:', bold: true, size: 20, font: 'Arial' })] }),
          blank(),
          new Paragraph({ children: [new TextRun({ text: `Snartemo, ${dato}`, size: 20, font: 'Arial' })] }),
        ] }),
      new TableCell({ borders: BORDERS, width: { size: c, type: WidthType.DXA }, margins: CELL_M,
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Underskrift / Signature:', bold: true, size: 20, font: 'Arial' })] }),
          blank(),
          new Paragraph({ children: [new TextRun({ text: d.ingenior, size: 20, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: d.produsent, size: 18, font: 'Arial', color: '6B7280' })] }),
        ] }),
    ]})]
  });
}

function makeDoc(children) {
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
          run: { size: 30, bold: true, font: 'Arial', color: '1A3A5C' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
          run: { size: 24, bold: true, font: 'Arial', color: '2B4C7E' },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      ]
    },
    sections: [{ properties: pageProps(), children }]
  });
}

// ─── Markdown → docx-noder ───────────────────────────────────────────────────
function parseMarkdown(text) {
  return text.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# '))   return h1(t.slice(2));
    if (t.startsWith('## '))  return h2(t.slice(3));
    if (t.startsWith('### ')) return new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: t.slice(4), bold: true, size: 22, font: 'Arial' })] });
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('- [ ] ')) {
      const txt = t.replace(/^-\s\[[ x]\]\s?/, '').replace(/^[-*]\s/, '');
      return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 },
        children: [new TextRun({ text: txt, size: 22, font: 'Arial' })] });
    }
    if (t.match(/^\d+\.\s/)) return new Paragraph({ numbering: { reference: 'nums', level: 0 },
      spacing: { after: 60 }, children: [new TextRun({ text: t.replace(/^\d+\.\s/, ''), size: 22, font: 'Arial' })] });
    return body(t);
  });
}

// ─── Dokument-builders ───────────────────────────────────────────────────────
function buildRisikovurdering(d, ai) {
  const dato  = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-RISK-${d.serienr.replace(/\s/g, '')}-Rev01`;
  return makeDoc([
    ...cover('Risikovurdering', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
    blank(),
    infoTable([
      ['Dokumentnummer', docNr],
      ['Maskin / utstyr',  d.maskin],
      ['Serienummer',      d.serienr],
      ['Prosjekt',         d.prosjekt],
      ['Produsent',        d.produsent],
      ['Kunde',            d.kunde],
      ['Ansvarlig',        d.ingenior],
      ['Dato',             dato],
      ['Standard',         'EN ISO 12100:2010'],
    ]),
    blank(),
    ...parseMarkdown(ai),
  ]);
}

function buildTekniskFil(d, ai) {
  const dato  = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-TECH-${d.serienr.replace(/\s/g, '')}-Rev01`;
  return makeDoc([
    ...cover('Teknisk Fil', `${d.maskin} · ${d.serienr}`, `${d.produsent} · ${dato}`),
    blank(),
    infoTable([
      ['Dokumentnummer',    docNr],
      ['Maskin',            d.maskin],
      ['Serienummer',       d.serienr],
      ['Produsent',         d.produsent],
      ['Adresse',           'Snartemo, Norge'],
      ['Drivsystem',        d.driv],
      ['Spenningsforsyning',d.spenning],
      ['Installasjonsmiljø',d.miljo],
      ['Direktiv',          'Maskindirektivet 2006/42/EC'],
      ['Dato',              dato],
    ]),
    blank(),
    ...parseMarkdown(ai),
  ]);
}

function buildSamsvarserklaring(d, ai) {
  const dato  = new Date().toLocaleDateString('no-NO');
  return makeDoc([
    ...cover('EF-Samsvarserklæring', 'EC Declaration of Conformity', `${d.maskin} · ${d.serienr}`),
    blank(),
    infoTable([
      ['Produsent / Manufacturer', d.produsent],
      ['Maskin / Machine',         d.maskin],
      ['Serienummer / Serial no.',  d.serienr],
      ['Prosjekt / Project',        d.prosjekt],
      ['Primært direktiv',          'Maskindirektivet 2006/42/EC'],
      ['Dato / Date',               dato],
    ]),
    blank(),
    ...parseMarkdown(ai),
    blank(),
    signatureTable(d, dato),
  ]);
}

function buildQCsjekkliste(d, ai) {
  const dato  = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-QC-${d.serienr.replace(/\s/g, '')}-Rev01`;
  return makeDoc([
    ...cover('QC-Sjekkliste', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
    blank(),
    infoTable([
      ['Dokumentnummer', docNr],
      ['Maskin',         d.maskin],
      ['Serienummer',    d.serienr],
      ['Prosjekt',       d.prosjekt],
      ['Kunde',          d.kunde],
      ['Ansvarlig',      d.ingenior],
      ['Dato',           dato],
    ]),
    blank(),
    ...parseMarkdown(ai),
  ]);
}

// ─── Parse maskindata ────────────────────────────────────────────────────────
function parseMachineData(raw) {
  const get = key => { const m = raw.match(new RegExp(key + ':\\s*(.+)')); return m ? m[1].trim() : '—'; };
  return {
    maskin:    get('Maskin'),
    produsent: get('Produsent'),
    serienr:   get('Serienummer'),
    prosjekt:  get('Prosjekt/lokasjon'),
    kunde:     get('Kunde'),
    ingenior:  get('Ansvarlig ingeniør'),
    driv:      get('Drivsystem'),
    spenning:  get('Spenningsforsyning'),
    miljo:     get('Installasjonsmiljø'),
  };
}

// ─── AI-generering ───────────────────────────────────────────────────────────
async function generateText(apiKey, docType, machineData) {
  const prompts = {
    risk: `Du er en teknisk compliance-ekspert. Skriv en komplett risikovurdering på norsk.
Marker manglende info med [MANGLER: beskrivelse]. Aldri spekuler.

${machineData}

Bruk disse ## seksjonene:
## 1. Omfang og formål
## 2. Maskinbeskrivelse
## 3. Fareidentifikasjon og risikovurdering
Beskriv minst 8 farer. For hver: beskrivelse, S(1-4), P(1-4), RPN=S×P, tiltak.
## 4. Restrisiko og konklusjon
## 5. Revisjonslogg

Kun markdown. Ingen JSON, ingen kodebokser.`,

    tech: `Du er en teknisk compliance-ekspert. Skriv en komplett teknisk fil på norsk.
Marker manglende info med [MANGLER: beskrivelse]. Aldri spekuler.

${machineData}

Bruk disse ## seksjonene:
## 1. Produktidentifikasjon
## 2. Teknisk beskrivelse og funksjon
## 3. Direktiver og standarder
## 4. Harmoniserte standarder
## 5. Tegningsliste og dokumentoversikt
## 6. Installasjon og driftsforhold
## 7. Vedlikeholdskrav

Kun markdown. Ingen JSON, ingen kodebokser.`,

    doc: `Du er en teknisk compliance-ekspert. Skriv en komplett EF-samsvarserklæring på norsk og engelsk.
Marker manglende info med [MANGLER: beskrivelse]. Aldri spekuler.

${machineData}

## Norsk versjon
(Fullstendig erklæringstekst: produsent, maskin, direktiver, standarder)
## English version
(Complete declaration: manufacturer, machine, directives, standards)

Inkluder: 2006/42/EC, 2014/35/EU, 2014/30/EU der relevant.
Kun markdown. Ingen JSON, ingen kodebokser.`,

    qc: `Du er en teknisk compliance-ekspert. Skriv en komplett QC-sjekkliste på norsk.
Marker manglende info med [MANGLER: beskrivelse]. Aldri spekuler.

${machineData}

Bruk disse ## seksjonene med minst 6 punkter hver:
## Mekanisk kontroll
## Hydraulikk / pneumatikk
## Elektrisk kontroll
## Sikkerhetsutstyr
## Funksjonskontroll
## Dokumentasjonskontroll

Hvert punkt: - [ ] Beskrivelse
Kun markdown. Ingen JSON, ingen kodebokser.`
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000,
      messages: [{ role: 'user', content: prompts[docType] }] })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Claude API feil');
  return data.content[0].text.trim();
}

// ─── Handler ─────────────────────────────────────────────────────────────────
function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};
  return body;
}

module.exports = async function handler(req, res) {
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      version: 'v7-esbuild-dir',
      bundled: typeof Document !== 'undefined',
      hasApiKey: !!process.env.ANTHROPIC_API_KEY
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { machineData } = parseBody(req);
  if (!machineData) return res.status(400).json({ error: 'Mangler maskindata' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler ANTHROPIC_API_KEY på server' });

  const d = parseMachineData(machineData);
  const safeSerial = d.serienr.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    // Generer alle 4 tekster parallelt
    const [riskTxt, techTxt, docTxt, qcTxt] = await Promise.all([
      generateText(apiKey, 'risk', machineData),
      generateText(apiKey, 'tech', machineData),
      generateText(apiKey, 'doc',  machineData),
      generateText(apiKey, 'qc',   machineData),
    ]);

    // Bygg .docx buffere parallelt
    const [riskBuf, techBuf, docBuf, qcBuf] = await Promise.all([
      Packer.toBuffer(buildRisikovurdering(d, riskTxt)),
      Packer.toBuffer(buildTekniskFil(d, techTxt)),
      Packer.toBuffer(buildSamsvarserklaring(d, docTxt)),
      Packer.toBuffer(buildQCsjekkliste(d, qcTxt)),
    ]);

    // Pakk til ZIP
    const zip    = new JSZip();
    const folder = zip.folder(`Complidoc_${safeSerial}`);
    folder.file(`01_Risikovurdering_${safeSerial}.docx`,    riskBuf);
    folder.file(`02_Teknisk_Fil_${safeSerial}.docx`,        techBuf);
    folder.file(`03_Samsvarserklaring_${safeSerial}.docx`,  docBuf);
    folder.file(`04_QC_Sjekkliste_${safeSerial}.docx`,      qcBuf);

    const zipB64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

    return res.status(200).json({
      zip:      zipB64,
      filename: `Complidoc_${d.maskin.replace(/[^a-zA-Z0-9]/g, '_')}_${safeSerial}.zip`,
    });

  } catch (err) {
    console.error('[debug-8fd491] generate error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  maxDuration: 60
};