import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProjectLimit } from '@/lib/auth/subscription';
import { formatSupabaseError } from '@/lib/supabaseError';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ allowed: true, enforced: false, used: 0, limit: -1 });
    }

    const result = await checkProjectLimit(user.id);
    return NextResponse.json({
      enforced: true,
      allowed: result.allowed,
      reason: result.reason,
      used: result.used,
      limit: result.limit,
      plan: result.plan,
      status: result.status,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
