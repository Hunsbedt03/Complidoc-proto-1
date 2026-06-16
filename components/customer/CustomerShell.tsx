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
          Mine prosjekter
        </Link>
        <Link
          href="/app/customer/settings/account"
          className={
            'app-nav-item' +
            (pathname?.startsWith('/app/customer/settings') ? ' active' : '')
          }
        >
          Min konto
        </Link>
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(26,111,212,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#85B7EB',
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 500 }}>
                  {profile?.full_name || user?.email?.split('@')[0] || 'Bruker'}
                </div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>{user?.email}</div>
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
