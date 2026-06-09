import { AppTopbar } from '@/components/app/AppShell';
import { ArchivePage } from '@/components/archive/ArchivePage';

export default function ArchiveRoutePage() {
  return (
    <>
      <AppTopbar
        title="Arkiv"
        subtitle="Bedriftsdokumenter som gjenbrukes på tvers av prosjekter"
      />
      <div className="app-content">
        <ArchivePage />
      </div>
    </>
  );
}
