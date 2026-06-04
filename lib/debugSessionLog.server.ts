import { appendFileSync } from 'fs';
import { join } from 'path';

const LOG_PATH = join(process.cwd(), 'debug-66cbbc.log');

export function debugSessionLogServer(payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    timestamp: Date.now(),
    ...payload,
  });
  try {
    appendFileSync(LOG_PATH, line + '\n');
  } catch {
    /* ignore */
  }
}
