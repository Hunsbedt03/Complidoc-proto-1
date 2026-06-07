import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSubscriptionEnforced } from '@/lib/auth/subscription';
import { syncUserSubscriptionFromStripe } from '@/lib/stripe/syncSubscription';
import { buildSubscriptionStatusResponse } from '@/lib/stripe/subscriptionStatusResponse';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function POST() {
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
      return NextResponse.json(
        buildSubscriptionStatusResponse(null, false, true)
      );
    }

    const profile = await syncUserSubscriptionFromStripe(user.id, user.email);
    return NextResponse.json(
      buildSubscriptionStatusResponse(profile, true, true)
    );
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
