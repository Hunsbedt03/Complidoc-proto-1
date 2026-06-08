const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType
} = require('docx');
const JSZip = require('jszip');
const { getPrompt, DOC_TITLES, VALID_DOC_TYPES } = require('./document-prompts');

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
function sanitizeText(text) {
  if (text == null) return '—';
  return String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\uFFFE|\uFFFF/g, '');
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: sanitizeText(text), bold: true, size: 30, font: 'Arial', color: '1A3A5C' })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: sanitizeText(text), bold: true, size: 24, font: 'Arial', color: '2B4C7E' })] });
}
function body(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text: sanitizeText(text), size: 22, font: 'Arial' })] });
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
          new Paragraph({ children: [new TextRun({ text: `Norge, ${dato}`, size: 20, font: 'Arial' })] }),
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
  return sanitizeText(text).split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (/^\|[-:| ]+\|$/.test(t)) return null;
    if (t.startsWith('# '))   return h1(t.slice(2));
    if (t.startsWith('## '))  return h2(t.slice(3));
    if (t.startsWith('### ')) return new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: sanitizeText(t.slice(4)), bold: true, size: 22, font: 'Arial' })] });
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('- [ ] ') || t.startsWith('- [x] ')) {
      const txt = t.replace(/^-\s\[[ x]\]\s?/, '').replace(/^[-*]\s/, '');
      return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 },
        children: [new TextRun({ text: sanitizeText(txt), size: 22, font: 'Arial' })] });
    }
    if (t.match(/^\d+\.\s/)) return body(t);
    if (t.startsWith('|')) return body(t.replace(/\|/g, ' · ').replace(/\s+/g, ' ').trim());
    return body(t);
  }).filter(Boolean);
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
    ...cover('Teknisk konstruksjonsfil', `${d.maskin} · ${d.serienr}`, `${d.produsent} · ${dato}`),
    blank(),
    infoTable([
      ['Dokumentnummer',     docNr],
      ['Maskin',             d.maskin],
      ['Serienummer',        d.serienr],
      ['Produsent',          d.produsent],
      ['Drivsystem',         d.drivsystem],
      ['Energikilde',        d.energikilde],
      ['Installasjonsmiljø', d.installasjonsmiljo],
      ['Direktiv',           'Maskindirektivet 2006/42/EC'],
      ['Dato',               dato],
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
      ['Produsent / Manufacturer',  d.produsent],
      ['Maskin / Machine',          d.maskin],
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

function buildGenericComplianceDoc(d, ai, title, prefix) {
  const dato  = new Date().toLocaleDateString('no-NO');
  const docNr = `FS-${prefix}-${d.serienr.replace(/\s/g, '')}-Rev01`;
  return makeDoc([
    ...cover(title, `${d.maskin} · ${d.prosjekt}`, `${d.produsent} · ${dato}`),
    blank(),
    infoTable([
      ['Dokumentnummer', docNr],
      ['Maskin',         d.maskin],
      ['Serienummer',    d.serienr],
      ['Prosjekt',       d.prosjekt],
      ['Produsent',      d.produsent],
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
  const get = key => {
    const m = raw.match(new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*(.+)$', 'm'));
    const val = m ? m[1].trim() : '';
    return (val && val !== 'Ikke spesifisert') ? val : '—';
  };
  const energikilde = get('Energikilde');
  const spenning = get('Spenningsforsyning');
  return {
    maskin:              get('Maskin'),
    produsent:           get('Produsent'),
    serienr:             get('Serienummer'),
    prosjekt:            get('Prosjekt/lokasjon'),
    kunde:               get('Kunde'),
    ingenior:            get('Ansvarlig ingeniør'),
    drivsystem:          get('Drivsystem'),
    energikilde:         energikilde !== '—' ? energikilde : spenning,
    installasjonsmiljo:  get('Installasjonsmiljø'),
    styring:             get('Styring'),
    tiltenktBruk:        get('Tiltenkt bruk'),
    marked:              get('Marked'),
    standarder:          get('Relevante standarder'),
    beskrivelse:         get('Beskrivelse'),
  };
}

// ─── Bygg kontekststreng for prompts ─────────────────────────────────────────
function buildContext(machineData) {
  const companyNote = String(machineData).includes('PRODUSENT / BEDRIFT')
    ? '\nVIKTIG: Produsentinformasjon under «PRODUSENT / BEDRIFT» skal brukes nøyaktig i dokumentet, spesielt i samsvarserklæringen.\n'
    : '';
  return `=== MASKINDATA FRA BRUKER ===
${machineData}
=== SLUTT MASKINDATA ===${companyNote}`;
}

// ─── AI-generering ───────────────────────────────────────────────────────────
async function generateText(apiKey, docType, machineData) {
  const context = buildContext(machineData);
  const prompt = getPrompt(docType, context);
  const maxTokens = docType === 'tech' || docType === 'technical_file' ? 4096 : 3500;
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    if (!res.ok) {
      lastError = new Error(data.error?.message || 'Claude API feil');
      if (attempt === 0 && (res.status === 429 || res.status === 529)) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw lastError;
    }

    const block = Array.isArray(data.content)
      ? data.content.find(b => b && b.type === 'text' && b.text)
      : null;
    if (!block || !block.text) {
      lastError = new Error('Claude returnerte tomt svar for ' + docType);
      throw lastError;
    }
    return sanitizeText(block.text).trim();
  }

  throw lastError || new Error('Claude API feil');
}

// ─── Handler ─────────────────────────────────────────────────────────────────
async function packDoc(label, buildFn) {
  try {
    return await Packer.toBuffer(buildFn());
  } catch (err) {
    throw new Error('docx ' + label + ': ' + err.message);
  }
}

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
      version: 'v10-universal',
      buildTag: 'full-doc-package-1',
      validDocTypes: VALID_DOC_TYPES.length,
      maxDuration: 120,
      bundled: typeof Document !== 'undefined',
      hasApiKey: !!process.env.ANTHROPIC_API_KEY
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { machineData, docType } = parseBody(req);
  if (!machineData) return res.status(400).json({ error: 'Mangler maskindata' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler ANTHROPIC_API_KEY på server' });

  const d = parseMachineData(machineData);
  const safeSerial = d.serienr.replace(/[^a-zA-Z0-9]/g, '_');
  const legacyAlias = {
    risk_assessment: 'risk',
    technical_file: 'tech',
    declaration_of_conformity: 'doc',
    qc_checklist: 'qc',
  };
  const resolvedType = legacyAlias[docType] || docType;

  try {
    if (docType) {
      if (!VALID_DOC_TYPES.includes(resolvedType)) {
        return res.status(400).json({ error: 'Ugyldig docType: ' + docType });
      }

      const txt = await generateText(apiKey, resolvedType, machineData);
      let buf;
      if (resolvedType === 'risk') {
        buf = await packDoc('risk', () => buildRisikovurdering(d, txt));
      } else if (resolvedType === 'tech') {
        buf = await packDoc('tech', () => buildTekniskFil(d, txt));
      } else if (resolvedType === 'doc') {
        buf = await packDoc('doc', () => buildSamsvarserklaring(d, txt));
      } else if (resolvedType === 'qc') {
        buf = await packDoc('qc', () => buildQCsjekkliste(d, txt));
      } else {
        const title = DOC_TITLES[resolvedType] || resolvedType;
        const prefix = resolvedType.slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DOC';
        buf = await packDoc(resolvedType, () =>
          buildGenericComplianceDoc(d, txt, title, prefix)
        );
      }

      const orderMap = {
        risk: '01', tech: '02', doc: '03', qc: '04',
        function_description: '05', bom: '06', calculation_report: '07',
        harmonized_standards_matrix: '08', fmea: '10', safety_function_analysis: '11',
        hazard_register: '12', emergency_stop_analysis: '13',
        user_manual_no: '20', user_manual_en: '21', installation_manual: '22',
        maintenance_manual: '23', spare_parts_list: '24', troubleshooting_guide: '25',
        nameplate_design: '30', warning_signs_spec: '31', operator_safety_instructions: '32',
        quality_control_plan: '40', fabrication_drawing_list: '41', welding_procedures: '42',
        ndt_protocol: '43', production_traceability_log: '44',
        ukca_declaration: '50', osha_sdoc: '51', csa_documentation: '52', rcm_declaration: '53',
        atex_documentation: '60', ped_technical_file: '61', emc_report: '62',
        low_voltage_checklist: '63', rohs_declaration: '64',
      };
      const order = orderMap[resolvedType] || '99';
      const slug = (DOC_TITLES[resolvedType] || resolvedType)
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '')
        .slice(0, 36);
      const filename = `${order}_${slug}_${safeSerial}.docx`;

      return res.status(200).json({
        docType: docType,
        docx: buf.toString('base64'),
        filename,
      });
    }

    return res.status(400).json({
      error: 'Bruk docType. Full pakke genereres i frontend med valgte dokumenter.',
    });

  } catch (err) {
    console.error('[samsiq] generate error:', docType, err.message);
    return res.status(500).json({ error: err.message, docType: docType || null });
  }
};

module.exports.config = {
  maxDuration: 120
};