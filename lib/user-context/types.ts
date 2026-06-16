export interface UserContext {
  type: 'supplier' | 'customer';
  id: string;
  name: string;
}

export type ActiveUserContext = {
  type: 'supplier' | 'customer';
  id: string;
};

export function dashboardPathForContext(context: ActiveUserContext): string {
  return context.type === 'customer' ? '/app/customer/dashboard' : '/app/dashboard';
}

export function resolvePostAuthRedirect(
  contexts: UserContext[],
  options?: {
    accountType?: 'supplier' | 'customer';
    storedContext?: ActiveUserContext | null;
  }
): string {
  if (options?.accountType === 'customer') {
    return '/app/customer/dashboard';
  }

  if (contexts.length === 0) {
    return '/app/onboarding/welcome';
  }

  if (contexts.length === 1) {
    return contexts[0].type === 'customer'
      ? '/app/customer/dashboard'
      : '/app/dashboard';
  }

  const stored = options?.storedContext;
  if (stored) {
    const match = contexts.find((c) => c.type === stored.type && c.id === stored.id);
    if (match) {
      return match.type === 'customer' ? '/app/customer/dashboard' : '/app/dashboard';
    }
  }

  const supplier = contexts.find((c) => c.type === 'supplier');
  if (supplier) return '/app/dashboard';

  return '/app/customer/dashboard';
}
