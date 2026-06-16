import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { UserContext } from '@/lib/user-context/types';

export type { ActiveUserContext, UserContext } from '@/lib/user-context/types';
export { resolvePostAuthRedirect } from '@/lib/user-context/types';

export async function getUserContexts(authUserId: string): Promise<UserContext[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const contexts: UserContext[] = [];

  const { data: userRow } = await admin
    .from('users')
    .select('company_id')
    .eq('id', authUserId)
    .maybeSingle();

  if (userRow?.company_id) {
    const { data: company } = await admin
      .from('company_profiles')
      .select('company_name')
      .eq('id', userRow.company_id)
      .maybeSingle();
    contexts.push({
      type: 'supplier',
      id: userRow.company_id,
      name: company?.company_name ?? 'Min bedrift',
    });
  } else {
    const { data: ownedCompany } = await admin
      .from('company_profiles')
      .select('id, company_name')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (ownedCompany) {
      contexts.push({
        type: 'supplier',
        id: ownedCompany.id,
        name: ownedCompany.company_name ?? 'Min bedrift',
      });
    }
  }

  const { data: customerUsers } = await admin
    .from('customer_users')
    .select('customer_organization_id, customer_organizations(name)')
    .eq('auth_user_id', authUserId);

  for (const cu of customerUsers ?? []) {
    const orgRaw = cu.customer_organizations as
      | { name?: string }
      | { name?: string }[]
      | null;
    const orgName = Array.isArray(orgRaw) ? orgRaw[0]?.name : orgRaw?.name;

    if (
      !contexts.some(
        (c) => c.type === 'customer' && c.id === cu.customer_organization_id
      )
    ) {
      contexts.push({
        type: 'customer',
        id: cu.customer_organization_id,
        name: orgName ?? 'Kunde',
      });
    }
  }

  return contexts;
}
