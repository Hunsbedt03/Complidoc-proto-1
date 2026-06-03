import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

function loadEnv() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin
  .from('prosjekter')
  .select('id, navn, user_id, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('DB_ERROR', error.message);
  process.exit(1);
}
console.log('PROJECT_COUNT', data?.length ?? 0);
console.log(JSON.stringify(data, null, 2));
