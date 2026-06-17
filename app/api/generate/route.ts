import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSubscriptionActive } from '@/lib/auth/subscription';
import { handleGenerate, generateHealthCheck } from '@/lib/generators/generateHandler';
import { formatSupabaseError } from '@/lib/supabaseError';

export const maxDuration = 120;
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(generateHealthCheck());
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }

  const subCheck = await checkSubscriptionActive(user.id);
  if (!subCheck.active) {
    return NextResponse.json(
      { error: subCheck.reason ?? 'Ingen aktivt abonnement' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const result = await handleGenerate(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[samsiq] generate error:', err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
