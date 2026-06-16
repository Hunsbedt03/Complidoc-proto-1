import { NextResponse } from 'next/server';
import { linkCustomerAccessForUser } from '@/lib/customer-portal/linkAccess';
import {
  getUserContexts,
  resolvePostAuthRedirect,
} from '@/lib/user-context/server';
import type { ActiveUserContext } from '@/lib/user-context/types';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';
import { syncUserProfileAfterAuthChange } from '@/lib/auth/syncProfile';
import { bootstrapTeamForUser } from '@/lib/team/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      forceCustomerLink?: boolean;
      accountType?: 'supplier' | 'customer';
      fullName?: string;
      storedContext?: ActiveUserContext | null;
    };

    const fullName =
      body.fullName ??
      (typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null);

    await linkCustomerAccessForUser(user.id, user.email, {
      force: body.forceCustomerLink === true || body.accountType === 'customer',
      fullName,
    });

    if (body.accountType === 'supplier') {
      const admin = createAdminClient();
      if (admin) {
        await bootstrapTeamForUser(admin, user.id).catch(() => {});
      }
    }

    await syncUserProfileAfterAuthChange(user).catch(() => {});

    const contexts = await getUserContexts(user.id);
    const redirectTo = resolvePostAuthRedirect(contexts, {
      accountType: body.accountType,
      storedContext: body.storedContext ?? null,
    });

    return NextResponse.json({ contexts, redirectTo });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
