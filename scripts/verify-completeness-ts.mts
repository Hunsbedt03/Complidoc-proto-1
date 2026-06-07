import { CORE_DOCUMENT_IDS } from '../lib/documents/ids.ts';
import { computePackageCompleteness } from '../lib/documents/completeness.ts';

const input = {};
const coreDocs = CORE_DOCUMENT_IDS.map((id) => ({
  documentId: id,
  docType: id,
  filename: `${id}.docx`,
  docx: 'x',
}));

const r1 = computePackageCompleteness(input, [...CORE_DOCUMENT_IDS], [], coreDocs, []);
console.log('real: core4 generated, no CAD', {
  isComplete: r1.isComplete,
  missingRequired: r1.missingRequired,
});

const r2 = computePackageCompleteness(input, [...CORE_DOCUMENT_IDS], [], coreDocs, [
  { documentId: 'cad_drawings', status: 'uploaded', fileName: 'x.pdf' },
]);
console.log('real: core4 + CAD', {
  isComplete: r2.isComplete,
  missingRequired: r2.missingRequired,
});

if (!r1.isComplete && r2.isComplete) process.exit(0);
process.exit(1);
