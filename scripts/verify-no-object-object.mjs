/**
 * Fail if active app sources still concatenate API errors raw (→ [object Object]).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'public/index.html', 'lib/generate.ts', 'components/app/ProjectForm.tsx'];

const badPatterns = [
  /alert\([^)]*\+\s*data\.error[^)]*\)/,
  /errMsg\s*=\s*j\.error\s*;/,
  /'\s*\+\s*data\.error/,
];

let failed = false;
for (const rel of files) {
  const text = readFileSync(join(root, rel), 'utf8');
  for (const re of badPatterns) {
    if (re.test(text) && !text.includes('formatApiErr') && !text.includes('formatApiError')) {
      console.error('[verify:no-oo] Bad pattern in', rel, re.toString());
      failed = true;
    }
  }
  if (/\+\s*data\.error/.test(text) && !/formatApiErr\(data\.error\)/.test(text)) {
    console.error('[verify:no-oo] Raw data.error concat in', rel);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('[verify:no-oo] OK — no raw object error concatenation.');
process.exit(0);
