/**
 * Runtime check for ZIP export gate (no TS loader required).
 */
const CORE = [
  'risk_assessment',
  'technical_file',
  'declaration_of_conformity',
  'qc_checklist',
];

function isComplete(generatedIds, uploads) {
  const missing = CORE.filter((id) => !generatedIds.includes(id));
  if (missing.length) return { ok: false, missing };
  const cad = uploads.find((u) => u.documentId === 'cad_drawings');
  if (!cad || cad.status !== 'uploaded') {
    return { ok: false, missing: ['cad_drawings'] };
  }
  return { ok: true, missing: [] };
}

const genOnly = isComplete([...CORE], []);
console.log('core4 no CAD', genOnly);

const withCad = isComplete([...CORE], [
  { documentId: 'cad_drawings', status: 'uploaded' },
]);
console.log('core4 + CAD', withCad);

if (!genOnly.ok && withCad.ok) process.exit(0);
process.exit(1);
