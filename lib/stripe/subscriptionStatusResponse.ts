import 'server-only';

import type { UserSubscriptionRow } from '@/lib/auth/subscription';
import { PLANS } from '@/lib/plans';

export type SubscriptionStatusPayload = {
  enforced: boolean;
  status: string;
  plan: string;
  used: number;
  limit: number;
  trialEnd: string | null;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
  synced?: boolean;
};

export function buildSubscriptionStatusResponse(
  profile: UserSubscriptionRow | null,
  enforced = true,
  synced = false
): SubscriptionStatusPayload {
  const plan = profile?.subscription_plan ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';
  const used = profile?.projects_used_this_month ?? 0;
  const limit =
    plan === 'pro'
      ? -1
      : plan === 'starter'
        ? PLANS.starter.limits.projectsPerMonth
        : 0;

  return {
    enforced,
    status,
    plan,
    used,
    limit,
    trialEnd: profile?.trial_end ?? null,
    periodEnd: profile?.subscription_period_end ?? null,
    hasStripeCustomer: !!profile?.stripe_customer_id,
    synced,
  };
}
