'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { ContextSwitcher } from '@/components/ContextSwitcher';
import { GlobalSubscriptionBanner } from '@/components/app/GlobalSubscriptionBanner';
import { useAuth, useUserInitials } from '@/components/providers/AuthProvider';

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span className="app-nav-icon" aria-hidden>
      {children}
    </span>
  );
}

const NAV = [
  {
    href: '/app/dashboard',
    label: 'Oversikt',
    id: 'dashboard',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: '/app/archive',
    label: 'Arkiv',
    id: 'archive',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
          <path d="M3 5h18v3H3z" />
          <path d="M10 12h4" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: '/app/new',
    label: 'Nytt prosjekt',
    id: 'new',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: '/app/settings',
    label: 'Innstillinger',
    id: 'settings',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </NavIcon>
    ),
  },
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
          {item.icon}
          {item.label}
        </Link>
      ))}
      <div className="sidebar-user">
        <ContextSwitcher className="context-switcher--sidebar" />
        <div className="sidebar-user-row">
          <div id="user-avatar" className="sidebar-avatar">
            {initials}
          </div>
          <div>
            <div id="user-name" className="sidebar-user-name">
              {profile?.full_name || user?.email?.split('@')[0] || 'Bruker'}
            </div>
            <div id="user-sub" className="sidebar-user-email">
              {user?.email}
            </div>
          </div>
        </div>
        <Link href="/app/settings/account" className="account-sidebar-link">
          Min konto
        </Link>
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

  if (pathname?.startsWith('/app/customer')) {
    return <>{children}</>;
  }

  if (pathname?.startsWith('/app/onboarding') || pathname === '/app/register') {
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
        <div className="app-main">
          <Suspense fallback={null}>
            <GlobalSubscriptionBanner />
          </Suspense>
          {children}
        </div>
      </div>
    </div>
  );
}
