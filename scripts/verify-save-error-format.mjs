import { appendFileSync } from 'fs';
import { formatSupabaseError } from '../lib/supabaseError.ts';

const LOG = 'debug-66cbbc.log';

function log(message, data, hypothesisId) {
  appendFileSync(
    LOG,
    JSON.stringify({
      sessionId: '66cbbc',
      runId: 'verify-save-format',
      hypothesisId,
      location: 'scripts/verify-save-error-format.mjs',
      message,
      data,
      timestamp: Date.now(),
    }) + '\n'
  );
  console.log(message, data ?? '');
}

const postgrest = {
  code: '23503',
  details: 'Key is not present in table "users".',
  hint: null,
  message: 'insert or update on table "maskiner" violates foreign key constraint',
};

const formatted = formatSupabaseError(postgrest);
const bad = formatted === '[object Object]' || !formatted.includes('23503');

log('formatSupabaseError PostgREST', { formatted, bad }, 'H1');
if (bad) process.exit(1);

process.exit(0);
