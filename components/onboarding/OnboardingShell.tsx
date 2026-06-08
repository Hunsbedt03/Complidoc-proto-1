'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { OnboardingProgress } from '@/components/OnboardingProgress';

type Props = {
  step: number;
  children: React.ReactNode;
};

export function OnboardingShell({ step, children }: Props) {
  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Link href="/">
          <Logo />
        </Link>
        <OnboardingProgress currentStep={step} />
      </header>
      <main className="onboarding-main">{children}</main>
    </div>
  );
}
