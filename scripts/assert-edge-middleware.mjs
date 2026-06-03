import fs from 'fs';

const rootMiddleware = 'middleware.ts';
const legacyLib = 'lib/supabase/middleware.ts';

if (!fs.existsSync(rootMiddleware)) {
  console.error('[middleware] missing root middleware.ts');
  process.exit(1);
}

if (fs.existsSync(legacyLib)) {
  console.error(
    `[middleware] remove ${legacyLib} — use Edge-safe auth in root middleware.ts only`
  );
  process.exit(1);
}

const source = fs.readFileSync(rootMiddleware, 'utf8').replace(/^\uFEFF/, '');
const forbidden = [
  '@/lib/supabase/middleware',
  "from '@supabase/ssr'",
  'from "@supabase/ssr"',
  "from '@supabase/supabase-js'",
  'from "@supabase/supabase-js"',
];

for (const needle of forbidden) {
  if (source.includes(needle)) {
    console.error(`[middleware] ${rootMiddleware} must not import ${needle} (Edge Runtime)`);
    process.exit(1);
  }
}

console.log('[middleware] Edge-safe root middleware OK');
