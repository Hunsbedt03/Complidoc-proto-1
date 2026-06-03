export function debugClientLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId?: string
) {
  fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, message, data, hypothesisId }),
  }).catch(() => {});
}
