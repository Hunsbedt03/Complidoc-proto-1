import { computePackageCompleteness } from '../lib/documents/completeness.ts';

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

console.log(
  'legacy docs AI complete',
  JSON.stringify({
    aiComplete: r.items
      .filter((i) => i.sourceType === 'ai_generated')
      .every((i) => i.status === 'complete'),
    isComplete: r.isComplete,
    missing: r.missingRequired,
  })
);

if (
  r.items.filter((i) => i.sourceType === 'ai_generated').every((i) => i.status === 'complete') &&
  r.isComplete
) {
  process.exit(0);
}
process.exit(1);
