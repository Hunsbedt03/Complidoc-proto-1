const base = process.env.SAMSIQ_BASE_URL || 'http://localhost:3000';

const routes = ['/app/new', '/app/dashboard', '/api/generate', '/api/health/supabase'];

let failed = 0;
for (const path of routes) {
  try {
    const res = await fetch(base + path);
    const text = await res.text();
    console.log(`${path} status`, { status: res.status, len: text.length });
    if (!res.ok) failed += 1;
  } catch (err) {
    console.log(`${path} error`, { error: String(err) });
    failed += 1;
  }
}

process.exit(failed > 0 ? 1 : 0);
