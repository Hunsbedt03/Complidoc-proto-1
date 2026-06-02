import { AppTopbar } from '@/components/app/AppShell';
import { OutputPanel } from '@/components/app/OutputPanel';
import { PANEL_TITLES } from '@/lib/constants';

export default function OutputPage() {
  const [title, subtitle] = PANEL_TITLES.output;
  return (
    <>
      <AppTopbar title={title} subtitle={subtitle} />
      <div className="app-content">
        <OutputPanel />
      </div>
    </>
  );
}
