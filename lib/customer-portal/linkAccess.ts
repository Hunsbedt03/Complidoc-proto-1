import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type LinkCustomerAccessResult = {
  organizationId: string;
  customerUserId: string;
};

function orgNameFromDomain(emailDomain: string | undefined, email: string): string {
  if (!emailDomain) return email;
  const base = emailDomain.split('.')[0];
  if (!base) return emailDomain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

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
  const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase();

  const { data: existingCustomerMembership } = await admin
    .from('customer_users')
    .select('id, customer_organization_id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

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

  if (!options?.force && !existingCustomerMembership && !hasPending) {
    return null;
  }

  let organizationId: string;

  if (emailDomain) {
    const { data: existingOrg } = await admin
      .from('customer_organizations')
      .select('id')
      .eq('email_domain', emailDomain)
      .maybeSingle();
    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      organizationId = await resolveOrCreateOrganization(
        admin,
        normalizedEmail,
        emailDomain,
        orgNameFromDomain(emailDomain, normalizedEmail)
      );
    }
  } else {
    organizationId = await resolveOrCreateOrganization(
      admin,
      normalizedEmail,
      emailDomain,
      orgNameFromDomain(emailDomain, normalizedEmail)
    );
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

async function resolveOrCreateOrganization(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  normalizedEmail: string,
  emailDomain: string | undefined,
  defaultName: string
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
