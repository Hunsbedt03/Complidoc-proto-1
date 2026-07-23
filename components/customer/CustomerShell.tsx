'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { ContextSwitcher } from '@/components/ContextSwitcher';
import { useAuth, useUserInitials } from '@/components/providers/AuthProvider';
import { writeActiveContext } from '@/lib/user-context/client';
import { useEffect } from 'react';

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const initials = useUserInitials();

  useEffect(() => {
    void fetch('/api/user/contexts')
      .then((res) => res.json())
      .then((json: { contexts?: { type: string; id: string }[] }) => {
        const customerCtx = json.contexts?.find((c) => c.type === 'customer');
        if (customerCtx) {
          writeActiveContext({ type: 'customer', id: customerCtx.id });
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div id="app-page">
      <nav className="customer-top-nav">
        <Link href="/">
          <Logo />
        </Link>
        <ContextSwitcher />
      </nav>
      <div className="app-wrap customer-wrap">
        <div className="app-sidebar customer-sidebar">
        <Link
          href="/app/customer/dashboard"
          className={
            'app-nav-item' + (pathname === '/app/customer/dashboard' ? ' active' : '')
          }
        >
          <span className="app-nav-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
          </span>
          Mine prosjekter
        </Link>
        <Link
          href="/app/customer/settings/account"
          className={
            'app-nav-item' +
            (pathname?.startsWith('/app/customer/settings') ? ' active' : '')
          }
        >
          <span className="app-nav-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </span>
          Min konto
        </Link>
          <div className="sidebar-user">
            <div className="sidebar-user-row" style={{ marginTop: 0 }}>
              <div className="sidebar-avatar">{initials}</div>
              <div>
                <div className="sidebar-user-name">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Bruker'}
                </div>
                <div className="sidebar-user-email">{user?.email}</div>
              </div>
            </div>
            <button type="button" className="btn-logout" onClick={() => void handleLogout()}>
              Logg ut
            </button>
          </div>
        </div>
        <div className="app-main customer-main">{children}</div>
      </div>
    </div>
  );
}
