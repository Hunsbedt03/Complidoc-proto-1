import { appendFileSync } from 'fs';
import { CORE_DOCUMENT_IDS } from '../lib/documents/ids.ts';
import { computePackageCompleteness } from '../lib/documents/completeness.ts';

const LOG = 'debug-66cbbc.log';

function log(message: string, data: Record<string, unknown>, hypothesisId: string) {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    runId: 'verify-completeness-ts',
    hypothesisId,
    location: 'scripts/verify-completeness-ts.mts',
    message,
    data,
    timestamp: Date.now(),
  });
  appendFileSync(LOG, line + '\n');
  console.log(message, data);
}

const input = {};
const coreDocs = CORE_DOCUMENT_IDS.map((id) => ({
  documentId: id,
  docType: id,
  filename: `${id}.docx`,
  docx: 'x',
}));

const r1 = computePackageCompleteness(input, [...CORE_DOCUMENT_IDS], [], coreDocs, []);
log('real: core4 generated, no CAD', {
  isComplete: r1.isComplete,
  missingRequired: r1.missingRequired,
}, 'P3-complete');

const r2 = computePackageCompleteness(input, [...CORE_DOCUMENT_IDS], [], coreDocs, [
  { documentId: 'cad_drawings', status: 'uploaded', fileName: 'x.pdf' },
]);
log('real: core4 + CAD', {
  isComplete: r2.isComplete,
  missingRequired: r2.missingRequired,
}, 'P3-complete');

if (!r1.isComplete && r2.isComplete) process.exit(0);
process.exit(1);
