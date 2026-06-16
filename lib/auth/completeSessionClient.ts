'use client';

import { readActiveContext } from '@/lib/user-context/client';

export async function completeSessionAfterAuth(options: {
  accountType?: 'supplier' | 'customer';
  forceCustomerLink?: boolean;
  fullName?: string;
}): Promise<{ redirectTo: string }> {
  const res = await fetch('/api/auth/complete-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...options,
      storedContext: readActiveContext(),
    }),
  });
  const json = (await res.json()) as { redirectTo?: string; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? 'Kunne ikke fullføre innlogging');
  }
  return { redirectTo: json.redirectTo ?? '/app/dashboard' };
}
