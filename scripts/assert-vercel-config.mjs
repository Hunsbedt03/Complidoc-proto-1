import fs from 'fs';

const path = process.env.VERCEL_CONFIG_PATH || 'vercel.json';
if (!fs.existsSync(path)) {
  if (path === 'vercel.json') {
    console.log('[vercel] no vercel.json — OK for Next.js App Router');
    process.exit(0);
  }
  console.error(`[vercel] config file not found: ${path}`);
  process.exit(1);
}

const raw = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const config = JSON.parse(raw);
if (config.functions) {
  console.error(
    '[vercel] vercel.json must not define "functions" for App Router routes under app/api/.'
  );
  console.error(
    '[vercel] Set export const maxDuration in app/api/<route>/route.ts instead.'
  );
  console.error('[vercel] Offending patterns:', Object.keys(config.functions).join(', '));
  process.exit(1);
}

console.log('[vercel] vercel.json OK (no legacy functions block)');
