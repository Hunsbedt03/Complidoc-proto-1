import { GenerationProvider } from '@/components/providers/GenerationProvider';
import { AppNav } from '@/components/app/AppShell';
import { ArchiveViewerHost } from '@/components/archive/ArchiveViewerHost';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GenerationProvider>
      <AppNav>{children}</AppNav>
      <ArchiveViewerHost />
    </GenerationProvider>
  );
}
