import { appendFileSync } from 'fs';

const LOG = 'debug-66cbbc.log';
const base = process.env.SAMSIQ_BASE_URL || 'http://localhost:3000';

function log(message, data, hypothesisId) {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    runId: 'verify-runtime',
    hypothesisId,
    location: 'scripts/verify-runtime.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  appendFileSync(LOG, line + '\n');
  console.log(message, data ?? '');
}

const routes = [
  ['/app/new', 'H-pages'],
  ['/app/dashboard', 'H-pages'],
  ['/api/generate', 'H-generate'],
  ['/api/health/supabase', 'H-health'],
];

let failed = 0;
for (const [path, hid] of routes) {
  try {
    const res = await fetch(base + path);
    const text = await res.text();
    log(`${path} status`, { status: res.status, len: text.length }, hid);
    if (!res.ok) failed += 1;
  } catch (err) {
    log(`${path} error`, { error: String(err) }, hid);
    failed += 1;
  }
}

process.exit(failed > 0 ? 1 : 0);
