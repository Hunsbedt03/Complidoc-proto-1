'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyProfileForm } from '@/components/CompanyProfileForm';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useAuth } from '@/components/providers/AuthProvider';
import type { CompanyProfile } from '@/lib/types';

export default function OnboardingCompanyPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [existing, setExisting] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        if (json?.profile) {
          setExisting(json.profile);
        } else if (profile?.full_name) {
          setExisting({
            companyName: '',
            orgNumber: '',
            address: '',
            postalCode: '',
            city: '',
            country: 'Norge',
            responsibleEngineer: profile.full_name,
            engineerTitle: '',
            phone: '',
          });
        }
      });
  }, [profile?.full_name]);

  async function saveProfile(p: CompanyProfile, skipValidation = false) {
    setSaving(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, skipValidation }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Lagring feilet');
      router.push('/app/onboarding/first-project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingShell step={2}>
      <div className="onboarding-card onboarding-card--wide">
        <h1 className="onboarding-title">Bedriftsinformasjon</h1>
        <p className="onboarding-lead">
          Opplysningene brukes i alle dokumenter — spesielt samsvarserklæringen.
        </p>
        <CompanyProfileForm
          existingProfile={existing}
          saving={saving}
          showSkip
          submitLabel="Fortsett →"
          onSubmit={(p) => saveProfile(p, false)}
          onSkip={() => router.push('/app/onboarding/first-project')}
        />
      </div>
    </OnboardingShell>
  );
}
