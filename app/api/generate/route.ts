import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSubscriptionActive } from '@/lib/auth/subscription';

export const maxDuration = 120;

type HandlerReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type HandlerRes = {
  statusCode: number;
  status(code: number): HandlerRes;
  setHeader(key: string, value: string): void;
  json(obj: unknown): void;
  end(text?: string): void;
};

function createHandlerResponse() {
  let statusCode = 200;
  let jsonBody: unknown = { error: 'Empty response' };

  const res: HandlerRes = {
    statusCode,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(obj: unknown) {
      jsonBody = obj;
    },
    end() {},
  };

  return {
    res,
    toNextResponse() {
      return NextResponse.json(jsonBody, { status: statusCode });
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const generateHandler = require('../../../api/generate.source.js');

async function runHandler(method: string, body?: unknown, headers?: Record<string, string>) {
  const { res, toNextResponse } = createHandlerResponse();
  await generateHandler({ method, body, headers }, res);
  return toNextResponse();
}

export async function GET() {
  return runHandler('GET');
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const subCheck = await checkSubscriptionActive(user.id);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: subCheck.reason ?? 'Ingen aktivt abonnement' },
        { status: 403 }
      );
    }
  }

  const body = await request.json();
  return runHandler('POST', body, Object.fromEntries(request.headers.entries()));
}
