import { AppTopbar } from '@/components/app/AppShell';
import { ProjectForm } from '@/components/app/ProjectForm';
import { PANEL_TITLES } from '@/lib/constants';

export default function NewProjectPage() {
  const [title, subtitle] = PANEL_TITLES.new;
  return (
    <>
      <AppTopbar title={title} subtitle={subtitle} />
      <div className="app-content">
        <ProjectForm />
      </div>
    </>
  );
}
