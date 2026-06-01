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
  return text.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('# '))   return h1(t.slice(2));
    if (t.startsWith('## '))  return h2(t.slice(3));
    if (t.startsWith('### ')) return new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: t.slice(4), bold: true, size: 22, font: 'Arial' })] });
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('- [ ] ') || t.startsWith('- [x] ')) {
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

// ─── Parse maskindata ────────────────────────────────────────────────────────
function parseMachineData(raw) {
  const get = key => {
    const m = raw.match(new RegExp(key + ':\\s*(.+)'));
    return (m && m[1].trim() !== '' && m[1].trim() !== 'Ikke spesifisert') ? m[1].trim() : '—';
  };
  return {
    maskin:              get('Maskin'),
    produsent:           get('Produsent'),
    serienr:             get('Serienummer'),
    prosjekt:            get('Prosjekt/lokasjon'),
    kunde:               get('Kunde'),
    ingenior:            get('Ansvarlig ingeniør'),
    drivsystem:          get('Drivsystem'),
    energikilde:         get('Energikilde'),
    installasjonsmiljo:  get('Installasjonsmiljø'),
    styring:             get('Styring'),
    tiltenktBruk:        get('Tiltenkt bruk'),
    beskrivelse:         get('Beskrivelse'),
  };
}

// ─── Bygg kontekststreng for prompts ─────────────────────────────────────────
function buildContext(machineData) {
  return `=== MASKINDATA FRA BRUKER ===
${machineData}
=== SLUTT MASKINDATA ===`;
}

// ─── AI-generering ───────────────────────────────────────────────────────────
async function generateText(apiKey, docType, machineData) {

  const context = buildContext(machineData);

  const MANGLER_REGEL = `
VIKTIG REGEL — [MANGLER]-prinsippet:
- Dersom et felt er "—", tomt, eller ikke oppgitt: skriv [MANGLER: kort beskrivelse av hva som mangler] akkurat der informasjonen ville stått.
- ALDRI spekker, gjett eller finn opp tekniske verdier, dimensjoner, vekt, spenning, effekt eller andre spesifikke tall.
- ALDRI anta maskintype, drivsystem, standarder eller direktiver utover det som er oppgitt.
- Dokumentet skal være klart til bruk — [MANGLER]-markørene viser nøyaktig hva ingeniøren må fylle inn.
- Skriv på norsk (bokmål) med faglig presisjon. Ingen spekulasjon.`;

  const prompts = {

    risk: `Du er en senior teknisk compliance-ekspert med dyp kunnskap om Maskindirektivet 2006/42/EC og EN ISO 12100:2010.

${MANGLER_REGEL}

${context}

Skriv en komplett risikovurdering basert KUN på informasjonen ovenfor.

Struktur (bruk nøyaktig disse ## overskriftene):

## 1. Omfang og formål
Beskriv hva denne risikovurderingen dekker. Referer til oppgitt maskintype og prosjekt.

## 2. Maskinbeskrivelse
Beskriv maskinen basert på oppgitt informasjon. Bruk [MANGLER: ...] for alle ukjente tekniske detaljer.

## 3. Grenser for maskinen
- Tiltenkt bruk og rimelig forutsigbar feilbruk
- Romlige grenser (arbeidsrom, installasjonsareal)
- Tidsmessige grenser (forventet levetid, vedlikeholdsintervaller)

## 4. Fareidentifikasjon og risikovurdering
Basert på oppgitt maskintype, identifiser relevante farer. For HVER fare:
**Fare [nr]: [navn]**
- Beskrivelse: ...
- Faregruppe (iht. EN ISO 12100 Annex B): ...
- Alvorlighetsgrad S (1=lett, 2=alvorlig, 3=svært alvorlig, 4=fatal): S = [verdi]
- Sannsynlighet P (1=usannsynlig, 4=sannsynlig): P = [verdi]
- RPN = S × P = [verdi]
- Tiltak: ...
- Restrisiko etter tiltak: Akseptabel / Ikke akseptabel

Identifiser minimum 8 relevante farer for denne maskintypen.

## 5. Risikoreduksjonstiltak — sammendrag
Oppsummer alle tiltak etter prioritet: 1) Innebygd sikkerhet, 2) Verneutstyr, 3) Brukerinformasjon.

## 6. Restrisiko og konklusjon
Samlet vurdering. Konkluder om maskinen kan CE-merkes.

## 7. Revisjonslogg
| Rev | Dato | Beskrivelse | Utført av |
|-----|------|-------------|-----------|
| 01  | [dato] | Første utgave | [MANGLER: ansvarlig ingeniør] |

Kun markdown. Ingen JSON. Ingen kodebokser.`,

    tech: `Du er en senior teknisk compliance-ekspert med dyp kunnskap om Maskindirektivet 2006/42/EC.

${MANGLER_REGEL}

${context}

Skriv en komplett teknisk fil (Technical File) basert KUN på informasjonen ovenfor.

Struktur (bruk nøyaktig disse ## overskriftene):

## 1. Produktidentifikasjon
Fullstendig produktidentifikasjon basert på oppgitte data. Bruk [MANGLER: ...] for ukjente felt.

## 2. Teknisk beskrivelse og virkemåte
Beskriv maskinens funksjon og virkemåte basert på oppgitt informasjon.
Tekniske spesifikasjoner: Bruk [MANGLER: spesifikk parameter] for alle ukjente verdier (vekt, dimensjoner, effekt, moment, osv.)

## 3. Gjeldende direktiver
List opp direktiver som er relevante for denne maskintypen basert på oppgitt informasjon:
- Maskindirektivet 2006/42/EC (alltid relevant for maskiner)
- Andre direktiver kun dersom de er relevante for oppgitt drivsystem/energikilde

## 4. Harmoniserte standarder
List harmoniserte standarder relevante for denne maskintypen. Basér utvalget på maskintype og tilgjengelig informasjon. Bruk [MANGLER: hvilken standard som trengs] dersom maskintypen ikke er tilstrekkelig beskrevet.

## 5. Tegningsliste og dokumentoversikt
| Dok.nr | Tittel | Type | Rev |
|--------|--------|------|-----|
| [MANGLER: tegningsnummer] | Samletegning | CAD-tegning | 01 |
| [MANGLER: dok.nr] | Hydraulikkskjema | P&ID | 01 |

(Tilpass til oppgitt maskintype — slett irrelevante rader, legg til relevante)

## 6. Installasjon og driftsforhold
Basert på oppgitt installasjonsmiljø og tiltenkt bruk.

## 7. Vedlikeholdskrav
Generelle vedlikeholdskrav for denne maskintypen. Spesifikke intervaller: [MANGLER: vedlikeholdsplan]

## 8. Referansedokumenter
- Risikovurdering: FS-RISK-[serienr]-Rev01
- QC-sjekkliste: FS-QC-[serienr]-Rev01
- EF-Samsvarserklæring: FS-DOC-[serienr]-Rev01

Kun markdown. Ingen JSON. Ingen kodebokser.`,

    doc: `Du er en senior teknisk compliance-ekspert med dyp kunnskap om CE-merking og Maskindirektivet 2006/42/EC.

${MANGLER_REGEL}

${context}

Skriv en komplett EF-samsvarserklæring på NORSK og ENGELSK.

Struktur (bruk nøyaktig disse ## overskriftene):

## Norsk versjon — EF-Samsvarserklæring

Vi, [produsent fra maskindata], erklærer under eneansvar at maskinen:

**Beskrivelse:** [maskintype fra data]
**Serienummer:** [serienummer fra data]
**Produksjonsår:** [MANGLER: produksjonsår]

er i samsvar med bestemmelsene i følgende EU-direktiver:

**Direktiver:**
- Maskindirektivet 2006/42/EC
[Legg til kun direktiver som er relevante basert på oppgitt drivsystem og energikilde — IKKE list direktiver som ikke er relevante]

**Harmoniserte standarder benyttet:**
[List relevante standarder basert på maskintype. Bruk [MANGLER: hvilken standard] dersom maskintypen er utilstrekkelig beskrevet]

Teknisk fil er utarbeidet og oppbevares av produsenten.

---

## English version — EC Declaration of Conformity

We, [manufacturer from machine data], declare under sole responsibility that the machine:

**Description:** [machine type from data]
**Serial number:** [serial number from data]
**Year of manufacture:** [MANGLER: year of manufacture]

conforms to the provisions of the following EU Directives:

**Directives:**
- Machinery Directive 2006/42/EC
[Add only directives relevant to the stated drive system and energy source]

**Harmonised standards applied:**
[List relevant standards based on machine type]

The technical file is established and kept by the manufacturer.

---

Kun markdown. Ingen JSON. Ingen kodebokser.`,

    qc: `Du er en senior teknisk compliance-ekspert og kvalitetsingeniør.

${MANGLER_REGEL}

${context}

Skriv en komplett QC-sjekkliste tilpasset denne SPESIFIKKE maskintypen basert KUN på oppgitt informasjon.

VIKTIG: Tilpass seksjonene til maskintypen. Inkluder KUN seksjoner som er relevante. En pumpe trenger ikke "Hydraulikk-seksjon" dersom det ikke er oppgitt hydraulikk. En elektromekanisk maskin trenger ikke "Hydraulikk"-seksjon.

Struktur — inkluder kun relevante seksjoner:

## Prosjektinformasjon
- [ ] Prosjektnummer og kundeinfo bekreftet
- [ ] Serienummer påført maskin
- [ ] Dokumentpakke komplett (risikovurdering, teknisk fil, samsvarserklæring)

## Mekanisk kontroll
[Minst 8 sjekkpunkter relevante for oppgitt maskintype]
- [ ] [sjekkpunkt]

## Drivsystem og energiforsyning
[Basert på oppgitt drivsystem og energikilde — bruk [MANGLER: spesifikk verdi] for ukjente grenseverdier]
- [ ] [sjekkpunkt]

## Sikkerhetssystemer og verneutstyr
[Basert på maskintype og installasjonsmiljø]
- [ ] Nødstopp tilstede og funksjonell
- [ ] [ytterligere sjekkpunkter]

## Funksjonskontroll
[Funksjonskontroll tilpasset maskintypen]
- [ ] [sjekkpunkt]

## Merking og dokumentasjon
- [ ] CE-merke påført med korrekt format
- [ ] Produsent og serienummer-plate montert
- [ ] Bruksanvisning medfølger på norsk (og engelsk der krevet)
- [ ] Samsvarserklæring signert og medfølger
- [ ] Teknisk fil arkivert hos produsent

## Godkjenning og signatur
- Utført av: [MANGLER: navn og stilling]
- Dato: [MANGLER: dato]
- Signatur: ___________________
- Godkjent av: [MANGLER: navn og stilling]

Kun markdown. Ingen JSON. Ingen kodebokser.`
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompts[docType] }]
    })
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
      version: 'v10-universal',
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
  const validTypes = ['risk', 'tech', 'doc', 'qc'];

  try {
    if (docType) {
      if (!validTypes.includes(docType)) {
        return res.status(400).json({ error: 'Ugyldig docType: ' + docType });
      }

      const txt = await generateText(apiKey, docType, machineData);
      let buf;
      if      (docType === 'risk') buf = await Packer.toBuffer(buildRisikovurdering(d, txt));
      else if (docType === 'tech') buf = await Packer.toBuffer(buildTekniskFil(d, txt));
      else if (docType === 'doc')  buf = await Packer.toBuffer(buildSamsvarserklaring(d, txt));
      else                         buf = await Packer.toBuffer(buildQCsjekkliste(d, txt));

      const names = {
        risk: `01_Risikovurdering_${safeSerial}.docx`,
        tech: `02_Teknisk_Fil_${safeSerial}.docx`,
        doc:  `03_Samsvarserklaring_${safeSerial}.docx`,
        qc:   `04_QC_Sjekkliste_${safeSerial}.docx`
      };

      return res.status(200).json({
        docType,
        docx: buf.toString('base64'),
        filename: names[docType]
      });
    }

    return res.status(400).json({
      error: 'Bruk docType (risk|tech|doc|qc). Full pakke genereres sekvensielt i frontend.'
    });

  } catch (err) {
    console.error('[samsiq] generate error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  maxDuration: 120
};