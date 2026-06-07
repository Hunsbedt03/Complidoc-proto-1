import 'server-only';

import type Stripe from 'stripe';
import {
  fetchUserSubscription,
  type UserSubscriptionRow,
} from '@/lib/auth/subscription';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import {
  persistUserSubscription,
  subscriptionPatch,
} from '@/lib/stripe/subscriptionUpdate';

const ACTIVE = new Set(['active', 'trialing']);

function pickBestSubscription(
  subs: Stripe.Subscription[]
): Stripe.Subscription | null {
  const ranked = subs
    .filter((s) => ACTIVE.has(s.status) || s.status === 'past_due')
    .sort((a, b) => b.created - a.created);
  return ranked[0] ?? null;
}

async function findSubscriptionForUser(
  stripe: Stripe,
  userId: string,
  email: string | undefined,
  profile: UserSubscriptionRow | null
): Promise<Stripe.Subscription | null> {
  if (profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (ACTIVE.has(sub.status) || sub.status === 'past_due') return sub;
    } catch {
      /* fall through */
    }
  }

  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 3 });
    const match =
      customers.data.find((c) => c.metadata?.userId === userId) ??
      customers.data[0];
    customerId = match?.id ?? null;
  }

  if (!customerId) {
    try {
      const byMeta = await stripe.subscriptions.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 5,
      });
      const found = pickBestSubscription(byMeta.data);
      if (found) return found;
    } catch {
      /* search API kan være utilgjengelig i test */
    }
    return null;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });

  const withMeta = subs.data.filter(
    (s) => !s.metadata?.userId || s.metadata.userId === userId
  );
  return pickBestSubscription(withMeta.length ? withMeta : subs.data);
}

/** Hent abonnement fra Stripe og skriv til Supabase når webhook er forsinket. */
export async function syncUserSubscriptionFromStripe(
  userId: string,
  email?: string
): Promise<UserSubscriptionRow | null> {
  if (!isStripeConfigured()) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const profile = await fetchUserSubscription(admin, userId);
  const currentStatus = profile?.subscription_status ?? 'inactive';

  if (ACTIVE.has(currentStatus)) {
    return profile;
  }

  const stripe = getStripe();
  const sub = await findSubscriptionForUser(stripe, userId, email, profile);
  if (!sub) {
    return profile;
  }

  const ok = await persistUserSubscription(userId, subscriptionPatch(sub));
  if (!ok) return profile;

  return fetchUserSubscription(admin, userId);
}
