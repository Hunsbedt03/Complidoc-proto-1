import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  const { pathname } = request.nextUrl;
  const isOnboardingRoute = pathname.startsWith('/app/onboarding');

  if (user && pathname.startsWith('/app')) {
    const onboardingDone = await isOnboardingCompleted(supabase, user.id);

    if (!onboardingDone && !isOnboardingRoute) {
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

  if (!user && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/app/new';
    const onboardingDone = await isOnboardingCompleted(supabase, user.id);
    const target = onboardingDone
      ? redirect
      : '/app/onboarding/welcome';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/app/:path*', '/login', '/api/:path*'],
};
