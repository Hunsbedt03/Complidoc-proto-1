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

/** Period end lives on SubscriptionItem since Stripe Basil (SDK v22+). */
export function getSubscriptionPeriodEndUnix(
  sub: Stripe.Subscription
): number | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  return typeof fromItem === 'number' ? fromItem : null;
}

export function formatSubscriptionPeriodEnd(
  sub: Stripe.Subscription
): string | null {
  const unix = getSubscriptionPeriodEndUnix(sub);
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export function formatSubscriptionTrialEnd(
  sub: Stripe.Subscription
): string | null {
  return sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
}

/** Stripe v22+ moved subscription ref from Invoice to parent.subscription_details. */
export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

export function subscriptionPatch(sub: Stripe.Subscription): SubscriptionUpdate {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const plan = getPlanFromPriceId(priceId);
  return {
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_plan: plan === 'free' ? 'free' : plan,
    subscription_period_end: formatSubscriptionPeriodEnd(sub),
    trial_end: formatSubscriptionTrialEnd(sub),
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
