import { AppTopbar } from '@/components/app/AppShell';
import { Dashboard } from '@/components/app/Dashboard';
import { PANEL_TITLES } from '@/lib/constants';

export default function DashboardPage() {
  const [title, subtitle] = PANEL_TITLES.dashboard;

  return (
    <>
      <AppTopbar title={title} subtitle={subtitle} />
      <div className="app-content">
        <Dashboard />
      </div>
    </>
  );
}
