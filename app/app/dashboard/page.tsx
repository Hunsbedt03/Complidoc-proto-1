import { Suspense } from 'react';
import { AppTopbar } from '@/components/app/AppShell';
import { Dashboard } from '@/components/app/Dashboard';
import { PANEL_TITLES } from '@/lib/constants';

export default function DashboardPage() {
  const [title, subtitle] = PANEL_TITLES.dashboard;

  return (
    <>
      <AppTopbar title={title} subtitle={subtitle} />
      <div className="app-content">
        <Suspense fallback={<p style={{ color: '#9CA3AF', fontSize: 14 }}>Laster…</p>}>
          <Dashboard />
        </Suspense>
      </div>
    </>
  );
}
