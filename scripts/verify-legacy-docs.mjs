import { appendFileSync } from 'fs';
import { computePackageCompleteness } from '../lib/documents/completeness.ts';

const LOG = 'debug-66cbbc.log';

function log(message, data, hypothesisId) {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    runId: 'post-fix',
    hypothesisId,
    location: 'scripts/verify-legacy-docs.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  appendFileSync(LOG, line + '\n');
  console.log(message, JSON.stringify(data));
}

const legacyDocs = [
  { docType: 'risk', filename: 'a.docx', docx: '' },
  { docType: 'tech', filename: 'b.docx', docx: '' },
  { docType: 'doc', filename: 'c.docx', docx: '' },
  { docType: 'qc', filename: 'd.docx', docx: '' },
];

const input = { maskin: 'Test', drivsystem: 'Pneumatisk' };
const r = computePackageCompleteness(input, [], [], legacyDocs, [
  { documentId: 'cad_drawings', status: 'uploaded', fileName: 'x.pdf' },
]);

log('legacy docs AI complete', {
  aiComplete: r.items
    .filter((i) => i.sourceType === 'ai_generated')
    .every((i) => i.status === 'complete'),
  isComplete: r.isComplete,
  missing: r.missingRequired,
}, 'P4-H7');

if (
  r.items.filter((i) => i.sourceType === 'ai_generated').every((i) => i.status === 'complete') &&
  r.isComplete
) {
  process.exit(0);
}
process.exit(1);
