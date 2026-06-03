import { appendFileSync, existsSync } from 'fs';
import path from 'path';

function resolveProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const DEBUG_LOG = path.join(resolveProjectRoot(), 'debug-66cbbc.log');
const INGEST =
  'http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015';

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId?: string
) {
  const entry = {
    sessionId: '66cbbc',
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };
  const line = `${JSON.stringify(entry)}\n`;

  try {
    appendFileSync(DEBUG_LOG, line);
  } catch (err) {
    console.error('[samsiq] debug log file write failed:', err);
  }

  fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '66cbbc',
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
