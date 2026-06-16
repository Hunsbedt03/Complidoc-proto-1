import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertUserProfileAdmin } from '@/lib/upsertUserProfileAdmin';

/** Synkroniser public.users og customer_users etter auth e-postendring. */
export async function syncUserProfileAfterAuthChange(user: User): Promise<void> {
  await upsertUserProfileAdmin(user);

  const admin = createAdminClient();
  if (!admin || !user.email) return;

  await admin
    .from('customer_users')
    .update({ email: user.email })
    .eq('auth_user_id', user.id);
}
