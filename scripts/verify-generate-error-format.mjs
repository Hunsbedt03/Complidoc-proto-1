import { appendFileSync } from 'fs';
import { formatApiError } from '../lib/parseJsonResponse.ts';

const LOG = 'debug-66cbbc.log';

function log(message, data, hypothesisId) {
  appendFileSync(
    LOG,
    JSON.stringify({
      sessionId: '66cbbc',
      runId: 'verify-generate-format',
      hypothesisId,
      location: 'scripts/verify-generate-error-format.mjs',
      message,
      data,
      timestamp: Date.now(),
    }) + '\n'
  );
  console.log(message, data ?? '');
}

const nested = { message: 'API key invalid', code: 'invalid_api_key' };
const formatted = formatApiError(nested);
const simulated = 'Feil ved risk_assessment: ' + formatted;
const bad = simulated.includes('[object Object]');

log('generate error string', { formatted, simulated, bad }, 'H1-gen');
if (bad) process.exit(1);
process.exit(0);
