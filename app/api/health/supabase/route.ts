import { NextResponse } from 'next/server';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';

export async function GET() {
  const hasServiceRole = isServiceRoleConfigured();
  let rpcExists = false;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/ensure_user_profile`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    );
    const text = await res.text();
    rpcExists = !text.includes('PGRST202');
  } catch {
    rpcExists = false;
  }

  const ready = hasServiceRole || rpcExists;
  const payload = {
    ready,
    hasServiceRole,
    rpcExists,
    hint: ready
      ? null
      : 'Legg SUPABASE_SERVICE_ROLE_KEY i .env.local eller kjør supabase/patch-ensure-user-profile.sql',
  };

  return NextResponse.json(payload);
}
