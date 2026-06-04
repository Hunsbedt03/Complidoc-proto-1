/** Client-safe debug logger (fetch only — no Node fs). */
const INGEST =
  'http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015';

export function debugSessionLog(payload: {
  location: string;
  message: string;
  hypothesisId: string;
  runId?: string;
  data?: Record<string, unknown>;
}): void {
  if (typeof fetch === 'undefined') return;
  const line = JSON.stringify({
    sessionId: '66cbbc',
    timestamp: Date.now(),
    runId: payload.runId ?? 'run',
    ...payload,
  });
  fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '66cbbc',
    },
    body: line,
  }).catch(() => {});
}
