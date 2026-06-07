import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';
import { getAppUrl, getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { getPriceId, type BillingCycle, type PlanId } from '@/lib/plans';

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe er ikke konfigurert — legg til STRIPE_SECRET_KEY i .env.local' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as {
      priceId?: string;
      plan?: PlanId;
      billingCycle?: BillingCycle;
    };

    const priceId =
      body.priceId?.trim() ||
      (body.plan && body.billingCycle
        ? getPriceId(body.plan, body.billingCycle)
        : undefined);

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            'Mangler priceId — legg STRIPE_*_PRICE_ID i .env.local eller send plan + billingCycle',
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id },
      },
      payment_method_collection: 'if_required',
      success_url: `${appUrl}/app/dashboard?payment=success`,
      cancel_url: `${appUrl}/priser?payment=cancelled`,
      locale: 'nb',
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Kunne ikke opprette checkout-sesjon' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
