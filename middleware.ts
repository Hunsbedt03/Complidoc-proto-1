import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit';

const AUTH_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };
const GENERATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 30 };
const INVITE_LIMIT = { windowMs: 60 * 1000, max: 5 };

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  const ip = clientIp(request);

  if (pathname.startsWith('/api/auth/')) {
    if (!rateLimit(`auth:${ip}`, AUTH_LIMIT)) {
      return NextResponse.json(
        { error: 'For mange forsøk. Prøv igjen om litt.' },
        { status: 429, headers: rateLimitHeaders(AUTH_LIMIT) }
      );
    }
  }

  if (pathname === '/api/generate') {
    if (!rateLimit(`generate:${ip}`, GENERATE_LIMIT)) {
      return NextResponse.json(
        { error: 'For mange genereringsforespørsler. Prøv igjen om litt.' },
        { status: 429, headers: rateLimitHeaders(GENERATE_LIMIT) }
      );
    }
  }

  if (
    (pathname === '/api/team/invite' && request.method === 'POST') ||
    (pathname.endsWith('/customer-access') && request.method === 'POST')
  ) {
    if (!rateLimit(`invite:${ip}:${pathname}`, INVITE_LIMIT)) {
      return NextResponse.json(
        { error: 'For mange invitasjoner. Prøv igjen om litt.' },
        { status: 429, headers: rateLimitHeaders(INVITE_LIMIT) }
      );
    }
  }

  return null;
}

type MiddlewareSupabase = ReturnType<typeof createServerClient>;

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

async function isOnboardingCompleted(
  supabase: MiddlewareSupabase,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? error);
    if (
      msg.includes('onboarding_completed') ||
      msg.includes('42703') ||
      msg.includes('PGRST204')
    ) {
      return true;
    }
    return true;
  }

  return data?.onboarding_completed !== false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rateLimited = checkRateLimit(request, pathname);
  if (rateLimited) return rateLimited;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOnboardingRoute = pathname.startsWith('/app/onboarding');
  const isRegisterRoute =
    pathname === '/app/register' || pathname.startsWith('/app/register/');
  const isPublicAppRoute = isRegisterRoute;

  if (user && pathname.startsWith('/app')) {
    const onboardingDone = await isOnboardingCompleted(supabase, user.id);

    if (!onboardingDone && !isOnboardingRoute && !isRegisterRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/app/onboarding/welcome';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (onboardingDone && isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/app/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (!user && pathname.startsWith('/app') && !isPublicAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || isRegisterRoute)) {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/app/new';
    const onboardingDone = await isOnboardingCompleted(supabase, user.id);
    const target = onboardingDone
      ? redirect === '/app/register'
        ? '/app/dashboard'
        : redirect
      : '/app/onboarding/welcome';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/app/:path*', '/login', '/api/:path*'],
};
