'use client';

import { useRouter } from 'next/navigation';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useAuth } from '@/components/providers/AuthProvider';

const STEPS = [
  { icon: '✦', text: 'Fyll inn maskindata' },
  { icon: '✦', text: 'AI genererer dokumentpakken' },
  { icon: '✦', text: 'Last ned, rediger og lås' },
];

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const firstName =
    profile?.full_name?.split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'der';

  return (
    <OnboardingShell step={1}>
      <div className="onboarding-card">
        <h1 className="onboarding-title">Velkommen til Samsiq, {firstName}!</h1>
        <p className="onboarding-lead">
          Vi hjelper deg med å generere komplett CE-dokumentasjon på minutter. La oss
          sette opp kontoen din.
        </p>
        <ul className="onboarding-steps-list">
          {STEPS.map((s) => (
            <li key={s.text}>
              <span className="onboarding-step-icon" aria-hidden>
                {s.icon}
              </span>
              {s.text}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-generate onboarding-cta"
          onClick={() => router.push('/app/onboarding/company')}
        >
          Kom i gang →
        </button>
      </div>
    </OnboardingShell>
  );
}
