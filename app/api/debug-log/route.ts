import { NextResponse } from 'next/server';
import { agentDebugLog } from '@/lib/debugLog';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const location = typeof body.location === 'string' ? body.location : 'unknown';
    const message = typeof body.message === 'string' ? body.message : 'debug';
    const data =
      body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {};
    const hypothesisId =
      typeof body.hypothesisId === 'string' ? body.hypothesisId : undefined;
    agentDebugLog(location, message, data, hypothesisId);
    return NextResponse.json({ ok: true, logged: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
