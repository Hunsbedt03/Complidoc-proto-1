import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function markProjectNotificationsRead(input: {
  organizationIds: string[];
  projectId: string;
  customerUserId?: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const now = new Date().toISOString();

  let query = admin
    .from('customer_notifications')
    .update({ read_at: now })
    .in('customer_organization_id', input.organizationIds)
    .eq('project_id', input.projectId)
    .is('read_at', null);

  if (input.customerUserId) {
    query = query.or(
      `customer_user_id.is.null,customer_user_id.eq.${input.customerUserId}`
    );
  }

  await query;
}

export async function getUnreadCountsByProject(
  organizationIds: string[]
): Promise<Record<string, number>> {
  const admin = createAdminClient();
  if (!admin || !organizationIds.length) return {};

  const { data, error } = await admin
    .from('customer_notifications')
    .select('project_id')
    .in('customer_organization_id', organizationIds)
    .is('read_at', null);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
  }
  return counts;
}
