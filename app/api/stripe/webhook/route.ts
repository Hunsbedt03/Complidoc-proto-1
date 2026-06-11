import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import {
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionCancelled,
  handleSubscriptionUpdated,
} from '@/lib/stripe/webhookHandlers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return new NextResponse('Stripe not configured', { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Missing webhook signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new NextResponse('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe] Webhook handler failed', event.type, err);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }

  return new NextResponse('OK', { status: 200 });
}
