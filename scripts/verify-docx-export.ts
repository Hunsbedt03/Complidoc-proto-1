/**
 * Sammenligner AI-generert DOCX (buildDocxBuffer) med eksport-DOCX (buildDocxFromBlocks).
 * Kjør: npx tsx scripts/verify-docx-export.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';
import { parseMachineFields } from '../lib/generators/machineFields';
import { buildDocxBuffer, buildDocxFromBlocks } from '../lib/generators/docxBuilder';
import { structuredDataToBlocks } from '../lib/document-model/structuredToBlocks';

const PAGE_W = 11906;
const PAGE_H = 16838;

async function readDocxPageSize(buf: Buffer): Promise<{ width?: string; height?: string; orient?: string }> {
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) return {};
  const sect = docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const pgSz = sect?.[0]?.match(/<w:pgSz[^>]*\/?>/);
  if (!pgSz) return {};
  const attrs = pgSz[0];
  const width = attrs.match(/\bw:w="(\d+)"/)?.[1];
  const height = attrs.match(/\bw:h="(\d+)"/)?.[1];
  const orient = attrs.match(/\bw:orient="(\w+)"/)?.[1];
  return { width, height, orient };
}

const sampleMachine = `Maskin: Testpresser TP-200
Produsent: Hultech AS
Serienummer: SN-2026-001
Prosjekt/lokasjon: Demo fabrikk
Kunde: Demo Kunde AS
Ansvarlig ingeniør: Ola Nordmann
Drivsystem: Elektrisk
Energikilde: 400V 3-fase
Installasjonsmiljø: Industrihall
Styring: PLC
Tiltenkt bruk: Platestamping
Marked: Norge/EU
Relevante standarder: EN ISO 12100
Beskrivelse: Hydraulisk testpresse for plater.`;

const sampleMarkdown = `## 1. Omfang
FMEA for testpresse TP-200.`;

const sampleStructured = {
  kind: 'fmea' as const,
  rows: [
    {
      komponent: 'Hydraulikkaggregat',
      feilmodus: 'Lekkasje',
      effekt: 'Redusert kraft',
      alvorlighet: 7,
      sannsynlighet: 3,
      detekterbarhet: 4,
      rpn: 84,
      tiltak: 'Inspeksjon hver 500 timer',
      notat: '',
    },
  ],
};

async function main() {
  const d = parseMachineFields(sampleMachine);
  const outDir = join(process.cwd(), 'tmp', 'docx-verify');
  mkdirSync(outDir, { recursive: true });

  const aiBuf = await buildDocxBuffer('fmea', d, sampleMarkdown, sampleStructured);
  writeFileSync(join(outDir, 'ai-generated-fmea.docx'), aiBuf);

  const blocks = structuredDataToBlocks(sampleStructured);
  const exportBuf = await buildDocxFromBlocks(
    'FMEA',
    {
      project: d.prosjekt,
      machine: d.maskin,
      revision: 1,
      date: new Date().toLocaleDateString('no-NO'),
      produsent: d.produsent,
      serienr: d.serienr,
      kunde: d.kunde,
      ingenior: d.ingenior,
      documentId: 'fmea',
    },
    blocks
  );
  writeFileSync(join(outDir, 'export-from-blocks-fmea.docx'), exportBuf);

  const exportPage = await readDocxPageSize(exportBuf);
  const aiPage = await readDocxPageSize(aiBuf);
  const landscapeOk =
    exportPage.orient === 'landscape' &&
    exportPage.width === String(PAGE_H) &&
    exportPage.height === String(PAGE_W);

  const sizeRatio = exportBuf.length / aiBuf.length;
  console.log('DOCX verify OK');
  console.log(`  AI generate:  ${aiBuf.length} bytes`);
  console.log(`  Export path:  ${exportBuf.length} bytes (ratio ${sizeRatio.toFixed(2)})`);
  console.log(`  Export page:  ${exportPage.width}x${exportPage.height} orient=${exportPage.orient ?? 'portrait'}`);
  console.log(`  AI page:      ${aiPage.width}x${aiPage.height} orient=${aiPage.orient ?? 'portrait'}`);
  console.log(`  Landscape:    ${landscapeOk ? 'OK (~29.7 cm wide)' : 'FAIL'}`);
  console.log(`  Output: tmp/docx-verify/*.docx`);
  if (!landscapeOk) {
    console.error('  ERROR: FMEA export must be A4 landscape (16838 x 11906 twips)');
    process.exit(1);
  }
  if (sizeRatio < 0.5) {
    console.warn('  WARN: export file much smaller than AI — check layout parity in Word');
  }
}

main().catch((err) => {
  console.error('verify-docx-export failed:', err);
  process.exit(1);
});
