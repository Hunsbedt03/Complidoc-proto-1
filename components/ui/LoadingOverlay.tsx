'use client';

type Props = {
  active: boolean;
  label: string;
  stepText: string;
  stepIndex: number;
};

export function LoadingOverlay({ active, label, stepText, stepIndex }: Props) {
  if (!active) return null;

  return (
    <div className="loading-overlay active">
      <div className="spinner" />
      <div className="loading-text">{label}</div>
      <div className="loading-step">{stepText}</div>
      <div className="loading-progress">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={'loading-dot' + (i === stepIndex ? ' active' : '')} />
        ))}
      </div>
    </div>
  );
}
