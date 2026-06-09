'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { useAuth, useUserInitials } from '@/components/providers/AuthProvider';

const NAV = [
  { href: '/app/dashboard', label: 'Oversikt', id: 'dashboard' },
  { href: '/app/archive', label: 'Arkiv', id: 'archive' },
  { href: '/app/new', label: 'Nytt prosjekt', id: 'new' },
  { href: '/app/settings', label: 'Innstillinger', id: 'settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const initials = useUserInitials();

  async function handleLogout() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="app-sidebar">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            'app-nav-item' +
            (pathname === item.href || (item.id === 'new' && pathname === '/app/output')
              ? ' active'
              : '')
          }
        >
          {item.label}
        </Link>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            id="user-avatar"
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
            <div id="user-name" style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 500 }}>
              {profile?.full_name || user?.email?.split('@')[0] || 'Bruker'}
            </div>
            <div id="user-sub" style={{ fontSize: 11, color: '#4B5563' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button type="button" className="btn-logout" id="btn-logout" onClick={handleLogout}>
          Logg ut
        </button>
      </div>
    </div>
  );
}

export function AppTopbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="app-topbar">
      <div>
        <div className="app-title" id="app-title">
          {title}
        </div>
        <div className="app-sub" id="app-sub">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/app/onboarding')) {
    return <>{children}</>;
  }

  return (
    <div id="app-page">
      <nav>
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/app/new" className="nav-cta">
          + Nytt prosjekt
        </Link>
      </nav>
      <div className="app-wrap">
        <AppSidebar />
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
