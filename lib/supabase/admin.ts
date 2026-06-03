import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function resolveServiceRoleKey(): string | undefined {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (process.env.NODE_ENV === 'development') {
    try {
      const fromFile = readFileSync(
        join(process.cwd(), '.supabase-service-role.local'),
        'utf8'
      ).trim();
      if (fromFile) return fromFile;
    } catch {
      /* optional dev file */
    }
  }
  return undefined;
}

export function isServiceRoleConfigured(): boolean {
  return !!resolveServiceRoleKey();
}

/** Service role client — bypasses RLS (server only, never expose to browser). */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = resolveServiceRoleKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
