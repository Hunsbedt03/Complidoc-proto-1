'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useAuth } from '@/components/providers/AuthProvider';

async function completeOnboarding(): Promise<void> {
  const res = await fetch('/api/onboarding/complete', { method: 'POST' });
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? 'Kunne ikke fullføre onboarding');
  }
}

export default function OnboardingFirstProjectPage() {
  const router = useRouter();
  const { refreshProfile, refreshProjects } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function finish(redirectTo: string) {
    setLoading(redirectTo);
    try {
      await completeOnboarding();
      await refreshProfile();
      await refreshProjects();
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt');
      setLoading(null);
    }
  }

  return (
    <OnboardingShell step={3}>
      <div className="onboarding-card">
        <h1 className="onboarding-title">Klar for første prosjekt?</h1>
        <p className="onboarding-lead">
          De fleste starter med å generere en dokumentpakke med en gang.
        </p>
        <div className="onboarding-choice-grid">
          <button
            type="button"
            className="onboarding-choice onboarding-choice--featured"
            disabled={!!loading}
            onClick={() => void finish('/app/new')}
          >
            <span className="onboarding-choice-icon" aria-hidden>
              🚀
            </span>
            <span className="onboarding-choice-badge">Anbefalt</span>
            <h3>Lag din første dokumentpakke</h3>
            <p>Ta 5 minutter og se Samsiq i aksjon</p>
          </button>
          <button
            type="button"
            className="onboarding-choice"
            disabled={!!loading}
            onClick={() => void finish('/app/dashboard')}
          >
            <span className="onboarding-choice-icon" aria-hidden>
              🧭
            </span>
            <h3>Utforsk dashboardet</h3>
            <p>Se rundt og kom tilbake når du er klar</p>
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
