import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  LevelFormat, PageNumber, Header, Footer, TabStopType, TabStopPosition,
  VerticalAlign
} from 'docx';
import JSZip from 'jszip';

// ─── Hjelpefunksjoner ───────────────────────────────────────────────────────

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

// A4-mål (docx-standard): 11906 × 16838 DXA, 1" = 1440 DXA
// Marginer: 1134 DXA ≈ 2 cm. Innholdsbredde = 11906 - 2*1134 = 9638 DXA
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1134;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9638

function pageProps() {
  return {
    page: {
      size: { width: PAGE_W, height: PAGE_H },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
    }
  };
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial' })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial' })]
  });
}

function body(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...options })]
  });
}

function emptyLine() {
  return new Paragraph({ children: [new TextRun('')] });
}

function infoTable(rows) {
  // rows: [ [label, value], ... ]
  const col1 = Math.round(CONTENT_W * 0.35);
  const col2 = CONTENT_W - col1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col1, col2],
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            borders: BORDERS,
            width: { size: col1, type: WidthType.DXA },
            margins: CELL_MARGINS,
            shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Arial' })] })]
          }),
          new TableCell({
            borders: BORDERS,
            width: { size: col2, type: WidthType.DXA },
            margins: CELL_MARGINS,
            children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 20, font: 'Arial' })] })]
          })
        ]
      })
    )
  });
}

function coverTable(title, subtitle, date) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 400 },
      children: [new TextRun({ text: title, bold: true, size: 52, font: 'Arial', color: '1A3A5C' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: subtitle, size: 28, font: 'Arial', color: '4B5563' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
      children: [new TextRun({ text: date, size: 22, font: 'Arial', color: '6B7280' })]
    })
  ];
}

function pageBreak() {
  return new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] });
}

function makeDoc(sections) {
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
          run: { size: 32, bold: true, font: 'Arial', color: '1A3A5C' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
          run: { size: 26, bold: true, font: 'Arial', color: '2B4C7E' },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
        }
      ]
    },
    sections
  });
}

// ─── Parse maskindata ───────────────────────────────────────────────────────

function parseMachineData(raw) {
  const get = (key) => {
    const m = raw.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : '—';
  };
  return {
    maskin: get('Maskin'),
    produsent: get('Produsent'),
    serienr: get('Serienummer'),
    prosjekt: get('Prosjekt/lokasjon'),
    kunde: get('Kunde'),
    ingenior: get('Ansvarlig ingeniør'),
    driv: get('Drivsystem'),
    spenning: get('Spenningsforsyning'),
    miljo: get('Installasjonsmiljø'),
    transport: get('Transport'),
    styring: get('Styring'),
    beskrivelse: get('Beskrivelse')
  };
}

// ─── Dokumentbuilder-funksjoner (én per doctype) ────────────────────────────

function buildRisikovurdering(d, aiContent) {
  const dato = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-RISK-${d.serienr.replace(/\s/g, '')}-Rev01`;

  // Parse AI-innhold til avsnitt
  const aiParagraphs = aiContent.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# ')) return heading1(t.slice(2));
    if (t.startsWith('## ')) return heading2(t.slice(3));
    if (t.startsWith('### ')) return new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: t.slice(4), bold: true, size: 22, font: 'Arial' })]
    });
    if (t.startsWith('- ') || t.startsWith('* ')) return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: t.slice(2), size: 22, font: 'Arial' })]
    });
    return body(t);
  });

  return makeDoc([{
    properties: pageProps(),
    children: [
      ...coverTable('Risikovurdering', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
      infoTable([
        ['Dokumentnummer', docNr],
        ['Maskin / utstyr', d.maskin],
        ['Serienummer', d.serienr],
        ['Prosjekt / lokasjon', d.prosjekt],
        ['Produsent', d.produsent],
        ['Kunde', d.kunde],
        ['Ansvarlig ingeniør', d.ingenior],
        ['Dato', dato],
        ['Standard', 'EN ISO 12100:2010']
      ]),
      emptyLine(),
      ...aiParagraphs
    ]
  }]);
}

function buildTekniskFil(d, aiContent) {
  const dato = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-TECH-${d.serienr.replace(/\s/g, '')}-Rev01`;

  const aiParagraphs = aiContent.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# ')) return heading1(t.slice(2));
    if (t.startsWith('## ')) return heading2(t.slice(3));
    if (t.startsWith('- ') || t.startsWith('* ')) return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: t.slice(2), size: 22, font: 'Arial' })]
    });
    return body(t);
  });

  return makeDoc([{
    properties: pageProps(),
    children: [
      ...coverTable('Teknisk Fil', `${d.maskin} · ${d.serienr}`, `${d.produsent} · ${dato}`),
      infoTable([
        ['Dokumentnummer', docNr],
        ['Maskin', d.maskin],
        ['Serienummer', d.serienr],
        ['Produsent', d.produsent],
        ['Adresse', 'Snartemo, Norge'],
        ['Drivsystem', d.driv],
        ['Spenningsforsyning', d.spenning],
        ['Installasjonsmiljø', d.miljo],
        ['Direktiv', 'Maskindirektivet 2006/42/EC'],
        ['Dato', dato]
      ]),
      emptyLine(),
      ...aiParagraphs
    ]
  }]);
}

function buildSamsvarserklaring(d, aiContent) {
  const dato = new Date().toLocaleDateString('no-NO');

  const aiParagraphs = aiContent.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# ')) return heading1(t.slice(2));
    if (t.startsWith('## ')) return heading2(t.slice(3));
    if (t.startsWith('- ') || t.startsWith('* ')) return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: t.slice(2), size: 22, font: 'Arial' })]
    });
    return body(t);
  });

  // Signaturblokk
  const col = Math.round(CONTENT_W / 2);
  const signaturBlokk = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col, col],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
            width: { size: col, type: WidthType.DXA },
            margins: CELL_MARGINS,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Sted og dato / Place and date:', bold: true, size: 20, font: 'Arial' })] }),
              emptyLine(),
              new Paragraph({ children: [new TextRun({ text: `Snartemo, ${dato}`, size: 20, font: 'Arial' })] })
            ]
          }),
          new TableCell({
            borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
            width: { size: col, type: WidthType.DXA },
            margins: CELL_MARGINS,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Underskrift / Signature:', bold: true, size: 20, font: 'Arial' })] }),
              emptyLine(),
              new Paragraph({ children: [new TextRun({ text: d.ingenior, size: 20, font: 'Arial' })] }),
              new Paragraph({ children: [new TextRun({ text: d.produsent, size: 18, font: 'Arial', color: '6B7280' })] })
            ]
          })
        ]
      })
    ]
  });

  return makeDoc([{
    properties: pageProps(),
    children: [
      ...coverTable('EF-Samsvarserklæring', `EC Declaration of Conformity`, `${d.maskin} · ${d.serienr}`),
      infoTable([
        ['Produsent / Manufacturer', d.produsent],
        ['Maskin / Machine', d.maskin],
        ['Serienummer / Serial no.', d.serienr],
        ['Prosjekt / Project', d.prosjekt],
        ['Primært direktiv', 'Maskindirektivet 2006/42/EC'],
        ['Dato / Date', dato]
      ]),
      emptyLine(),
      ...aiParagraphs,
      emptyLine(),
      signaturBlokk
    ]
  }]);
}

function buildQCsjekkliste(d, aiContent) {
  const dato = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-QC-${d.serienr.replace(/\s/g, '')}-Rev01`;

  // Parse QC-innhold — behandl tabellrader spesielt
  const aiParagraphs = aiContent.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# ')) return heading1(t.slice(2));
    if (t.startsWith('## ')) return heading2(t.slice(3));
    if (t.startsWith('- ') || t.startsWith('* ')) return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [new TextRun({ text: t.slice(2), size: 22, font: 'Arial' })]
    });
    return body(t);
  });

  return makeDoc([{
    properties: pageProps(),
    children: [
      ...coverTable('QC-Sjekkliste', `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
      infoTable([
        ['Dokumentnummer', docNr],
        ['Maskin', d.maskin],
        ['Serienummer', d.serienr],
        ['Prosjekt', d.prosjekt],
        ['Kunde', d.kunde],
        ['Ansvarlig', d.ingenior],
        ['Dato', dato]
      ]),
      emptyLine(),
      ...aiParagraphs
    ]
  }]);
}

// ─── AI-generering ──────────────────────────────────────────────────────────

async function generateSingleDoc(apiKey, docType, machineData) {
  const prompts = {
    risk: `Du er en teknisk compliance-ekspert spesialisert på risikovurdering.
Skriv en komplett profesjonell risikovurdering på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med ## overskrifter:
## 1. Omfang og formål
## 2. Maskinbeskrivelse
## 3. Fareidentifikasjon og risikovurdering
(Beskriv minst 8 konkrete farer med beskrivelse, alvorlighetsgrad S(1-4), sannsynlighet P(1-4), RPN=S×P, og tiltak)
## 4. Restrisiko og konklusjon
## 5. Revisjonslogg

Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    tech: `Du er en teknisk compliance-ekspert spesialisert på teknisk dokumentasjon.
Skriv en komplett teknisk fil på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med ## overskrifter:
## 1. Produktidentifikasjon
## 2. Teknisk beskrivelse og funksjon
## 3. Anvendte direktiver og standarder
## 4. Harmoniserte standarder
## 5. Tegningsliste og dokumentoversikt
## 6. Installasjon og driftsforhold
## 7. Vedlikeholdskrav

Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    doc: `Du er en teknisk compliance-ekspert spesialisert på samsvarserklæringer.
Skriv en komplett EF-samsvarserklæring på norsk og engelsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder:
## Norsk versjon / Norwegian version
(Fullstendig samsvarserklæringstekst med produsent, maskin, direktiver, standarder)
## English version
(Complete declaration of conformity text with manufacturer, machine, directives, standards)

Inkluder: Maskindirektivet 2006/42/EC, LVD 2014/35/EU, EMC 2014/30/EU der relevant.
Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    qc: `Du er en teknisk compliance-ekspert spesialisert på kvalitetskontroll.
Skriv en komplett QC-sjekkliste på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med minst 6 punkter hver:
## Mekanisk kontroll
## Hydraulikk / pneumatikk (hvis relevant)
## Elektrisk kontroll
## Sikkerhetsutstyr
## Funksjonskontroll
## Dokumentasjonskontroll

Hvert punkt på formatet: - [ ] Beskrivelse av kontrollpunkt
Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompts[docType] }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API-feil');
  return data.content[0].text.trim();
}

// ─── Hovedhandler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { machineData } = req.body;
  if (!machineData) return res.status(400).json({ error: 'Mangler maskindata' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler API-nøkkel på server' });

  const d = parseMachineData(machineData);
  const zip = new JSZip();
  const folder = zip.folder(`Complidoc_${d.serienr.replace(/[^a-zA-Z0-9]/g, '_')}`);

  const fileNames = {
    risk: `01_Risikovurdering_${d.serienr.replace(/\s/g, '-')}.docx`,
    tech: `02_Teknisk_Fil_${d.serienr.replace(/\s/g, '-')}.docx`,
    doc:  `03_Samsvarserklaring_${d.serienr.replace(/\s/g, '-')}.docx`,
    qc:   `04_QC_Sjekkliste_${d.serienr.replace(/\s/g, '-')}.docx`
  };

  try {
    // Generer alle 4 AI-tekster parallelt for raskere respons
    const [riskText, techText, docText, qcText] = await Promise.all([
      generateSingleDoc(apiKey, 'risk', machineData),
      generateSingleDoc(apiKey, 'tech', machineData),
      generateSingleDoc(apiKey, 'doc',  machineData),
      generateSingleDoc(apiKey, 'qc',   machineData)
    ]);

    // Bygg .docx-filer
    const riskDoc  = buildRisikovurdering(d, riskText);
    const techDoc  = buildTekniskFil(d, techText);
    const docDoc   = buildSamsvarserklaring(d, docText);
    const qcDoc    = buildQCsjekkliste(d, qcText);

    // Pack til buffere
    const [riskBuf, techBuf, docBuf, qcBuf] = await Promise.all([
      Packer.toBuffer(riskDoc),
      Packer.toBuffer(techDoc),
      Packer.toBuffer(docDoc),
      Packer.toBuffer(qcDoc)
    ]);

    // Legg til i ZIP
    folder.file(fileNames.risk, riskBuf);
    folder.file(fileNames.tech, techBuf);
    folder.file(fileNames.doc,  docBuf);
    folder.file(fileNames.qc,   qcBuf);

    // Generer ZIP som base64 (fungerer i serverless/Vercel uten filesystem)
    const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

    return res.status(200).json({
      zip: zipBase64,
      filename: `Complidoc_${d.maskin.replace(/[^a-zA-Z0-9]/g, '_')}_${d.serienr.replace(/\s/g, '-')}.zip`,
      files: fileNames
    });

  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({ error: err.message });
  }
}
