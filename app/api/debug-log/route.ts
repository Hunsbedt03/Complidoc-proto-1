import { appendFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

const LOG_PATH = join(process.cwd(), 'debug-66cbbc.log');

/** Server-only: append NDJSON for debug session (used when ingest proxy is unavailable). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    appendFileSync(LOG_PATH, JSON.stringify(body) + '\n');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
