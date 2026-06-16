import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/** Om linkCustomerAccessForUser bør kjøres ved innlogging. */
export async function shouldLinkCustomerAccess(
  authUserId: string,
  email: string,
  options?: { force?: boolean; accountType?: 'supplier' | 'customer' }
): Promise<boolean> {
  if (options?.force || options?.accountType === 'customer') {
    return true;
  }

  const admin = createAdminClient();
  if (!admin) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase();

  const { data: membership } = await admin
    .from('customer_users')
    .select('id, email')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (membership && membership.email?.toLowerCase() !== normalizedEmail) {
    return true;
  }

  if (membership) {
    return false;
  }

  const { count: pendingEmailCount } = await admin
    .from('customer_project_access')
    .select('id', { count: 'exact', head: true })
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending');

  if ((pendingEmailCount ?? 0) > 0) return true;

  if (emailDomain) {
    const { count: pendingDomainCount } = await admin
      .from('customer_project_access')
      .select('id', { count: 'exact', head: true })
      .like('invited_email', `%@${emailDomain}`)
      .eq('status', 'pending');
    if ((pendingDomainCount ?? 0) > 0) return true;
  }

  return false;
}
