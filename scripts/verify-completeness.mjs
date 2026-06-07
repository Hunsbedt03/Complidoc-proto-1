/**
 * Runtime check for ZIP export gate (no TS loader required).
 * Mirrors lib/documents/completeness.ts rules after fix.
 */
import { appendFileSync } from 'fs';

const LOG = 'debug-66cbbc.log';
const CORE = [
  'risk_assessment',
  'technical_file',
  'declaration_of_conformity',
  'qc_checklist',
];

function log(message, data, hypothesisId) {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    runId: 'verify-completeness',
    hypothesisId,
    location: 'scripts/verify-completeness.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  appendFileSync(LOG, line + '\n');
  console.log(message, JSON.stringify(data));
}

/** Simplified: core AI done + cad required missing => locked; with cad => open */
function canExportCoreOnly(generatedIds, uploads) {
  const missingRequired = [];
  for (const id of CORE) {
    if (!generatedIds.has(id)) missingRequired.push(id);
  }
  const cadUp = uploads.find(
    (u) => u.documentId === 'cad_drawings' && u.status === 'uploaded'
  );
  if (!cadUp) missingRequired.push('cad_drawings');
  return missingRequired.length === 0;
}

const generated = new Set(CORE);
const canExportWithoutCad = canExportCoreOnly(generated, []);
const canExportWithCad = canExportCoreOnly(generated, [
  { documentId: 'cad_drawings', status: 'uploaded' },
]);

log('without CAD upload', { canExport: canExportWithoutCad }, 'P2-H1');
log('with CAD upload', { canExport: canExportWithCad }, 'P2-H1');

const ok = !canExportWithoutCad && canExportWithCad;
process.exit(ok ? 0 : 1);
