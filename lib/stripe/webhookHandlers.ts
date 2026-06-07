import 'server-only';

import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/client';
import { getPlanFromPriceId } from '@/lib/stripe/planFromPrice';

type SubscriptionUpdate = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_period_end: string | null;
  trial_end: string | null;
};

async function updateUserSubscription(
  userId: string,
  patch: SubscriptionUpdate
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    console.error('[stripe] Admin client unavailable — subscription not persisted');
    return;
  }

  const { error } = await admin.from('users').update(patch).eq('id', userId);
  if (error) {
    console.error('[stripe] Failed to update user subscription', userId, error);
  }
}

function subscriptionPatch(sub: Stripe.Subscription): SubscriptionUpdate {
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

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id;
  const customerId = session.customer as string | null;
  const subscriptionId = session.subscription as string | null;

  if (!userId || !customerId || !subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateUserSubscription(userId, subscriptionPatch(subscription));
}

export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await updateUserSubscription(userId, subscriptionPatch(sub));
}

export async function handleSubscriptionCancelled(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await updateUserSubscription(userId, {
    subscription_status: 'canceled',
    subscription_plan: 'free',
    subscription_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_end: null,
  });
}

export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await updateUserSubscription(userId, {
    subscription_status: 'past_due',
    subscription_plan: getPlanFromPriceId(sub.items.data[0]?.price?.id ?? ''),
    subscription_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  });
}
