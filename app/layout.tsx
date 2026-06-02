import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Samsiq — AI-drevet industriell dokumentasjon',
  description: 'Generer risikovurderinger, tekniske filer, samsvarserklæringer og QC-sjekklister.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
