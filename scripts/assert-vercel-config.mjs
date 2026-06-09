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

const raw = fs.readFileSync(path, 'utf8');
if (raw.charCodeAt(0) === 0xfeff || raw.startsWith('\uFEFF')) {
  console.error(`[vercel] ${path} has UTF-8 BOM — remove it (save as UTF-8 without BOM)`);
  process.exit(1);
}
const config = JSON.parse(raw);

if (config.outputDirectory) {
  console.error(
    '[vercel] vercel.json must not set outputDirectory for Next.js — Vercel uses .next automatically.'
  );
  console.error(
    '[vercel] Remove outputDirectory from vercel.json and clear "Output Directory" in Vercel project settings.'
  );
  process.exit(1);
}

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

if (config.framework && config.framework !== 'nextjs') {
  console.error('[vercel] framework must be "nextjs" for this project');
  process.exit(1);
}

console.log('[vercel] vercel.json OK (Next.js App Router)');
