import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export function emailDomainFromAddress(email: string): string | undefined {
  return email.trim().toLowerCase().split('@')[1];
}

export function orgNameFromDomain(emailDomain: string | undefined, email: string): string {
  if (!emailDomain) return email;
  const base = emailDomain.split('.')[0];
  if (!base) return emailDomain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function findOrganizationIdByEmailDomain(
  email: string
): Promise<string | null> {
  const domain = emailDomainFromAddress(email);
  if (!domain) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('customer_organizations')
    .select('id')
    .eq('email_domain', domain)
    .maybeSingle();

  return data?.id ?? null;
}
