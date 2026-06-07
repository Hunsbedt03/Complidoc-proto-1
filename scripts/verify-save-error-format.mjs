import { formatSupabaseError } from '../lib/supabaseError.ts';

const postgrest = {
  code: '23503',
  details: 'Key is not present in table "users".',
  hint: null,
  message: 'insert or update on table "maskiner" violates foreign key constraint',
};

const formatted = formatSupabaseError(postgrest);
const bad = formatted === '[object Object]' || !formatted.includes('23503');

console.log('formatSupabaseError PostgREST', { formatted, bad });
if (bad) process.exit(1);
process.exit(0);
