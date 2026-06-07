import 'server-only';

import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanFromPriceId } from '@/lib/stripe/planFromPrice';

export type SubscriptionUpdate = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_period_end: string | null;
  trial_end: string | null;
};

export function subscriptionPatch(sub: Stripe.Subscription): SubscriptionUpdate {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const plan = getPlanFromPriceId(priceId);
  return {
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: plan === 'free' ? 'free' : plan,
    subscription_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  };
}

export async function persistUserSubscription(
  userId: string,
  patch: SubscriptionUpdate
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.error('[stripe] Admin client unavailable — subscription not persisted');
    return false;
  }

  const { error } = await admin.from('users').update(patch).eq('id', userId);
  if (error) {
    console.error('[stripe] Failed to update user subscription', userId, error);
    return false;
  }
  return true;
}
