'use client';

import { AccountSettings } from '@/components/account/AccountSettings';

export default function CustomerAccountSettingsPage() {
  return (
    <div className="customer-content">
      <header className="customer-project-detail-header">
        <h1>Min konto</h1>
        <p>Passord, e-post og kontoinformasjon</p>
      </header>
      <AccountSettings />
    </div>
  );
}
