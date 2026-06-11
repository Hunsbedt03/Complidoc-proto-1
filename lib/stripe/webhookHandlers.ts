import 'server-only';

import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { getPlanFromPriceId } from '@/lib/stripe/planFromPrice';
import {
  formatSubscriptionPeriodEnd,
  formatSubscriptionTrialEnd,
  getInvoiceSubscriptionId,
  persistUserSubscription,
  subscriptionPatch,
} from '@/lib/stripe/subscriptionUpdate';

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id;
  const customerId = session.customer as string | null;
  const subscriptionId = session.subscription as string | null;

  if (!userId || !customerId || !subscriptionId) {
    console.error('[stripe] checkout.session.completed missing fields', {
      userId: !!userId,
      customerId: !!customerId,
      subscriptionId: !!subscriptionId,
    });
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const ok = await persistUserSubscription(userId, subscriptionPatch(subscription));
  if (!ok) {
    throw new Error('Failed to persist subscription after checkout');
  }
}

export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.warn('[stripe] subscription.updated without metadata.userId', sub.id);
    return;
  }
  const ok = await persistUserSubscription(userId, subscriptionPatch(sub));
  if (!ok) {
    throw new Error('Failed to persist subscription update');
  }
}

export async function handleSubscriptionCancelled(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.warn('[stripe] subscription.deleted without metadata.userId', sub.id);
    return;
  }
  const ok = await persistUserSubscription(userId, {
    subscription_status: 'canceled',
    subscription_plan: 'free',
    subscription_period_end: formatSubscriptionPeriodEnd(sub),
    trial_end: null,
  });
  if (!ok) {
    throw new Error('Failed to persist subscription cancellation');
  }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id ?? '');
  const ok = await persistUserSubscription(userId, {
    subscription_status: 'past_due',
    subscription_plan: plan === 'free' ? 'free' : plan,
    subscription_period_end: formatSubscriptionPeriodEnd(sub),
    trial_end: formatSubscriptionTrialEnd(sub),
  });
  if (!ok) {
    throw new Error('Failed to persist payment_failed status');
  }
}
