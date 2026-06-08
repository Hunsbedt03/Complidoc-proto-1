'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/app/AppShell';
import { CompanyProfileForm } from '@/components/CompanyProfileForm';
import type { CompanyProfile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        setProfile(json?.profile ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(p: CompanyProfile) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p }),
      });
      const json = (await res.json()) as { profile?: CompanyProfile; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Lagring feilet');
      setProfile(json.profile ?? p);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppTopbar title="Innstillinger" subtitle="Konto og bedriftsinformasjon" />
      <div className="app-content">
        <section className="settings-section">
          <h2 className="settings-section-title">Bedriftsinformasjon</h2>
          <p className="form-info">
            Disse opplysningene brukes automatisk i alle genererte dokumenter.
          </p>
          {loading ? (
            <p className="form-info">Laster…</p>
          ) : (
            <>
              {saved ? (
                <p className="settings-saved">Bedriftsinformasjon lagret.</p>
              ) : null}
              <CompanyProfileForm
                existingProfile={profile}
                saving={saving}
                submitLabel="Lagre endringer"
                onSubmit={handleSave}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
