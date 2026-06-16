/** Base app URL for redirects, e-postlenker og Stripe (klient + server). */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim();
  }
  if (process.env.SAMSIQ_BASE_URL?.trim()) {
    return process.env.SAMSIQ_BASE_URL.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://samsiq.no';
  }
  return 'http://localhost:3000';
}

export function authCallbackUrl(next: string): string {
  const base = getAppUrl().replace(/\/$/, '');
  const path = next.startsWith('/') ? next : `/${next}`;
  return `${base}/auth/callback?next=${encodeURIComponent(path)}`;
}
