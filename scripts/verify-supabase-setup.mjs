import { existsSync, readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

let hasServiceRole = /SUPABASE_SERVICE_ROLE_KEY=\s*\S+/.test(env);
if (!hasServiceRole && existsSync('.supabase-service-role.local')) {
  hasServiceRole = !!readFileSync('.supabase-service-role.local', 'utf8').trim();
}

async function probe() {
  const rpcRes = await fetch(`${url}/rest/v1/rpc/ensure_user_profile`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const rpcText = await rpcRes.text();
  const rpcExists = !rpcText.includes('PGRST202');

  const data = {
    hasServiceRole,
    rpcExists,
    ready: hasServiceRole || rpcExists,
  };
  console.log(JSON.stringify(data, null, 2));
  if (!data.ready) {
    console.error('\nLagring vil feile til du enten:');
    console.error('1) Legger SUPABASE_SERVICE_ROLE_KEY i .env.local, eller');
    console.error('2) Kjører supabase/patch-ensure-user-profile.sql i Supabase SQL Editor');
    console.error('3) Eller bruk lokal fallback (automatisk når sky feiler pga. oppsett)');
    process.exit(1);
  }
}

probe();
