import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function upsertUserProfileAdmin(user: User): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.fullName === 'string' && meta.fullName) ||
    null;

  const { error } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(formatSupabaseError(error));
  return true;
}
