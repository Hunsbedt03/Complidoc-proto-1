import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchUserSubscription,
  isSubscriptionEnforced,
} from '@/lib/auth/subscription';
import { PLANS } from '@/lib/plans';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    if (!isSubscriptionEnforced()) {
      return NextResponse.json({
        enforced: false,
        status: 'active',
        plan: 'pro',
        used: 0,
        limit: -1,
        trialEnd: null,
        periodEnd: null,
        hasStripeCustomer: false,
      });
    }

    const profile = await fetchUserSubscription(supabase, user.id);
    const plan = profile?.subscription_plan ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';
    const used = profile?.projects_used_this_month ?? 0;
    const limit =
      plan === 'pro'
        ? -1
        : plan === 'starter'
          ? PLANS.starter.limits.projectsPerMonth
          : 0;

    return NextResponse.json({
      enforced: true,
      status,
      plan,
      used,
      limit,
      trialEnd: profile?.trial_end ?? null,
      periodEnd: profile?.subscription_period_end ?? null,
      hasStripeCustomer: !!profile?.stripe_customer_id,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
