'use client';

import { AppTopbar } from '@/components/app/AppShell';
import { AccountSettings } from '@/components/account/AccountSettings';

export default function SupplierAccountSettingsPage() {
  return (
    <>
      <AppTopbar title="Min konto" subtitle="Passord, e-post og kontoinformasjon" />
      <div className="app-content">
        <AccountSettings />
      </div>
    </>
  );
}
