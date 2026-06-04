/**
 * Kjør: SUPABASE_DB_PASSWORD=<db-passord> node scripts/apply-db-patch.mjs
 * Passord fra Supabase Dashboard → Project Settings → Database
 */
import { readFileSync } from 'fs';
import postgres from 'postgres';

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Sett SUPABASE_DB_PASSWORD (database password fra Supabase Dashboard).');
  process.exit(1);
}

const projectRef = 'gzbpsiemdavaawqgkqtw';
const profileSql = readFileSync('supabase/patch-ensure-user-profile.sql', 'utf8');
const docTypeSql = readFileSync('supabase/patch-doc-type-expand.sql', 'utf8');
const sql = profileSql + '\n' + docTypeSql;

const connectionString =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const db = postgres(connectionString, { ssl: 'require', max: 1 });

try {
  await db.unsafe(sql);
  console.log('Database patch applied successfully.');
} catch (err) {
  console.error('Patch feilet:', err.message);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
