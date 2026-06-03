import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_APP_PATHS = ['/app/new', '/app/output', '/app/dashboard'];

function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

/** Edge-safe: detect Supabase auth cookies without importing @supabase/ssr. */
function hasSupabaseSession(request: NextRequest): boolean {
  const ref = getSupabaseProjectRef();
  if (!ref) return false;
  const prefix = `sb-${ref}-auth-token`;
  return request.cookies.getAll().some(
    (cookie) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`)
  );
}

function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasSupabaseSession(request);

  if (!authenticated && pathname.startsWith('/app') && !isPublicAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (authenticated && pathname === '/login') {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/app/new';
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};
