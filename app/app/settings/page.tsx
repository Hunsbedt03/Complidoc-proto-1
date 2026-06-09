'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/app/AppShell';
import { ExtendedCompanySettings } from '@/components/settings/ExtendedCompanySettings';
import type { CompanyProfile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        setProfile(json?.profile ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppTopbar
        title="Innstillinger"
        subtitle="Bedriftsprofil, sertifiseringer og standardverdier"
      />
      <div className="app-content">
        <ExtendedCompanySettings initialProfile={profile} loading={loading} />
      </div>
    </>
  );
}
