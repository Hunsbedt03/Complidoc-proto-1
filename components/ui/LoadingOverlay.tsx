'use client';

type Props = {
  active: boolean;
  label: string;
  stepText: string;
  stepIndex: number;
  total?: number;
};

export function LoadingOverlay({ active, label, stepText, stepIndex, total = 4 }: Props) {
  if (!active) return null;

  const dotCount = Math.min(Math.max(total, 1), 12);
  const activeDot = stepIndex < 0 ? dotCount - 1 : Math.min(stepIndex, dotCount - 1);

  return (
    <div className="loading-overlay active">
      <div className="spinner" />
      <div className="loading-text">{label}</div>
      <div className="loading-step">{stepText}</div>
      <div className="loading-progress">
        {Array.from({ length: dotCount }, (_, i) => (
          <div
            key={i}
            className={'loading-dot' + (i === activeDot ? ' active' : '')}
          />
        ))}
      </div>
    </div>
  );
}
