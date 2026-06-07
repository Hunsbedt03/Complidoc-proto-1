import { formatApiError } from '../lib/parseJsonResponse.ts';

const nested = { message: 'API key invalid', code: 'invalid_api_key' };
const formatted = formatApiError(nested);
const simulated = 'Feil ved risk_assessment: ' + formatted;
const bad = simulated.includes('[object Object]');

console.log('generate error string', { formatted, simulated, bad });
if (bad) process.exit(1);
process.exit(0);
