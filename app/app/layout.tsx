import { GenerationProvider } from '@/components/providers/GenerationProvider';
import { AppNav } from '@/components/app/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GenerationProvider>
      <AppNav>{children}</AppNav>
    </GenerationProvider>
  );
}
