import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY mangler i miljøvariabler');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { typescript: true });
  }
  return stripeClient;
}
