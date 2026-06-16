import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

const MISCONFIGURED_MSG =
  'Server misconfigured: missing service role key (SUPABASE_SERVICE_ROLE_KEY)';

/** Krever admin-klient på server-ruter som ikke skal falle tilbake til anon-RLS. */
export function requireAdminClient(): SupabaseClient {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(MISCONFIGURED_MSG);
  }
  return admin;
}
