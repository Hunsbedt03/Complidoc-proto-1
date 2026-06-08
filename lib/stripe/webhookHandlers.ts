import 'server-only';

import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { getPlanFromPriceId } from '@/lib/stripe/planFromPrice';
import {
  formatSubscriptionPeriodEnd,
  formatSubscriptionTrialEnd,
  persistUserSubscription,
  subscriptionPatch,
} from '@/lib/stripe/subscriptionUpdate';

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id;
  const customerId = session.customer as string | null;
  const subscriptionId = session.subscription as string | null;

  if (!userId || !customerId || !subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await persistUserSubscription(userId, subscriptionPatch(subscription));
}

export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await persistUserSubscription(userId, subscriptionPatch(sub));
}

export async function handleSubscriptionCancelled(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await persistUserSubscription(userId, {
    subscription_status: 'canceled',
    subscription_plan: 'free',
    subscription_period_end: formatSubscriptionPeriodEnd(sub),
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

  const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id ?? '');
  await persistUserSubscription(userId, {
    subscription_status: 'past_due',
    subscription_plan: plan === 'free' ? 'free' : plan,
    subscription_period_end: formatSubscriptionPeriodEnd(sub),
    trial_end: formatSubscriptionTrialEnd(sub),
  });
}
