/**
 * Kjør alle Prompt 4-verifikasjoner (skriver debug-66cbbc.log).
 * Exit 0 = alt OK.
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  'scripts/verify-no-object-object.mjs',
  'scripts/verify-generate-error-format.mjs',
  'scripts/verify-save-error-format.mjs',
  'scripts/verify-upload-requirements.mjs',
  'scripts/verify-legacy-docs.mjs',
  'scripts/verify-completeness-ts.mts',
  'scripts/verify-runtime.mjs',
];

for (const script of steps) {
  const r = spawnSync('npx', ['tsx', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    console.error('[verify:p4] FAILED:', script);
    process.exit(1);
  }
}
console.log('[verify:p4] All checks passed.');
process.exit(0);
