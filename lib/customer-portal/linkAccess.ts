import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type LinkCustomerAccessResult = {
  organizationId: string;
  customerUserId: string;
};

/**
 * Kobler innlogget bruker til kundeorganisasjon og aktiverer pending invitasjoner.
 *
 * `force: true` — bruk ved eksplisitt kunderegistrering (`accountType: 'customer'`)
 * eller når complete-session vet at brukeren skal inn i kundeportalen uten pending-rader.
 */
export async function linkCustomerAccessForUser(
  authUserId: string,
  email: string,
  options?: { force?: boolean; fullName?: string | null }
): Promise<LinkCustomerAccessResult | null> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler — kan ikke koble kundetilgang');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingMembership } = await admin
    .from('customer_users')
    .select('id, customer_organization_id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.customer_organization_id && !options?.force) {
    return {
      organizationId: existingMembership.customer_organization_id,
      customerUserId: existingMembership.id,
    };
  }

  const { data: rpcRows, error: rpcError } = await admin.rpc('link_customer_access_for_user', {
    p_auth_user_id: authUserId,
    p_email: normalizedEmail,
    p_full_name: options?.fullName ?? null,
    p_force: options?.force === true,
  });

  if (rpcError) {
    const msg = rpcError.message ?? '';
    if (
      msg.includes('link_customer_access_for_user') ||
      msg.includes('42883') ||
      msg.includes('PGRST202')
    ) {
      return linkCustomerAccessLegacy(admin, authUserId, normalizedEmail, options);
    }
    throw rpcError;
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!row?.organization_id || !row?.customer_user_id) {
    return null;
  }

  return {
    organizationId: row.organization_id as string,
    customerUserId: row.customer_user_id as string,
  };
}

/** Fallback før migrering 20260618 er kjørt. */
async function linkCustomerAccessLegacy(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  authUserId: string,
  normalizedEmail: string,
  options?: { force?: boolean; fullName?: string | null }
): Promise<LinkCustomerAccessResult | null> {
  const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase();

  const { count: pendingEmailCount } = await admin
    .from('customer_project_access')
    .select('id', { count: 'exact', head: true })
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending');

  let pendingDomainCount = 0;
  if (emailDomain) {
    const { count } = await admin
      .from('customer_project_access')
      .select('id', { count: 'exact', head: true })
      .like('invited_email', `%@${emailDomain}`)
      .eq('status', 'pending');
    pendingDomainCount = count ?? 0;
  }

  const hasPending = (pendingEmailCount ?? 0) > 0 || pendingDomainCount > 0;

  const { data: existingCustomerMembership } = await admin
    .from('customer_users')
    .select('id, customer_organization_id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (!options?.force && !existingCustomerMembership && !hasPending) {
    return null;
  }

  let organizationId: string;
  const orgNameFromDomain = emailDomain
    ? emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1)
    : normalizedEmail;

  if (emailDomain) {
    const { data: existingOrg } = await admin
      .from('customer_organizations')
      .select('id')
      .eq('email_domain', emailDomain)
      .maybeSingle();
    organizationId = existingOrg?.id ?? (await createOrgLegacy(admin, orgNameFromDomain, emailDomain, normalizedEmail));
  } else {
    organizationId = await createOrgLegacy(admin, orgNameFromDomain, emailDomain, normalizedEmail);
  }

  const { data: existingCustomerUser } = await admin
    .from('customer_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('customer_organization_id', organizationId)
    .maybeSingle();

  let customerUserId: string;
  if (existingCustomerUser) {
    customerUserId = existingCustomerUser.id;
    if (options?.fullName) {
      await admin
        .from('customer_users')
        .update({ full_name: options.fullName })
        .eq('id', customerUserId);
    }
  } else {
    const { count } = await admin
      .from('customer_users')
      .select('id', { count: 'exact', head: true })
      .eq('customer_organization_id', organizationId);

    const { data: newCustomerUser, error } = await admin
      .from('customer_users')
      .insert({
        auth_user_id: authUserId,
        customer_organization_id: organizationId,
        email: normalizedEmail,
        full_name: options?.fullName ?? null,
        role: (count ?? 0) === 0 ? 'admin' : 'member',
      })
      .select('id')
      .single();

    if (error) throw error;
    customerUserId = newCustomerUser.id;
  }

  const activatedAt = new Date().toISOString();

  await admin
    .from('customer_project_access')
    .update({
      status: 'active',
      customer_organization_id: organizationId,
      customer_user_id: customerUserId,
      activated_at: activatedAt,
    })
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending');

  if (emailDomain) {
    await admin
      .from('customer_project_access')
      .update({ customer_organization_id: organizationId })
      .like('invited_email', `%@${emailDomain}`)
      .is('customer_organization_id', null);
  }

  return { organizationId, customerUserId };
}

async function createOrgLegacy(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  defaultName: string,
  emailDomain: string | undefined,
  normalizedEmail: string
): Promise<string> {
  const { data: pendingWithOrg } = await admin
    .from('customer_project_access')
    .select('customer_organization_id')
    .eq('invited_email', normalizedEmail)
    .not('customer_organization_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (pendingWithOrg?.customer_organization_id) {
    return pendingWithOrg.customer_organization_id;
  }

  const { data: newOrg, error } = await admin
    .from('customer_organizations')
    .insert({ name: defaultName, email_domain: emailDomain ?? null })
    .select('id')
    .single();

  if (error) throw error;
  return newOrg.id;
}
