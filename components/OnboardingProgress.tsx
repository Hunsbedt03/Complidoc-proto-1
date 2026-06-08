type Props = {
  currentStep: number;
  totalSteps?: number;
};

export function OnboardingProgress({ currentStep, totalSteps = 3 }: Props) {
  return (
    <div className="onboarding-progress" aria-label={`Steg ${currentStep} av ${totalSteps}`}>
      <span className="onboarding-progress-label">
        Steg {currentStep} av {totalSteps}
      </span>
      <div className="onboarding-progress-dots">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <span key={step} className="onboarding-progress-track">
              <span
                className={
                  'onboarding-progress-dot' +
                  (done || active ? ' onboarding-progress-dot--on' : '')
                }
              />
              {step < totalSteps ? (
                <span
                  className={
                    'onboarding-progress-line' +
                    (done ? ' onboarding-progress-line--on' : '')
                  }
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
