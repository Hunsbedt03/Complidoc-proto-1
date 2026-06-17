'use client';

type Props = {
  /** Kompakt variant for dokumentkort; full variant i editor */
  compact?: boolean;
};

export function PlSilVerificationBanner({ compact = false }: Props) {
  return (
    <div
      className={
        compact ? 'pl-sil-banner pl-sil-banner--compact' : 'pl-sil-banner'
      }
      role="alert"
    >
      <span className="pl-sil-banner-icon" aria-hidden>
        ⚠
      </span>
      <div className="pl-sil-banner-body">
        <p className="pl-sil-banner-title">
          PL/SIL — må verifiseres av kvalifisert person
        </p>
        {!compact ? (
          <p className="pl-sil-banner-text">
            Resultatet fra denne analysen skal kontrolleres og signeres av en
            kvalifisert person med kompetanse innen funksjonssikkerhet (EN ISO
            13849 / IEC 62061) før dokumentet kan brukes som grunnlag i en
            samsvarserklæring.
          </p>
        ) : (
          <p className="pl-sil-banner-text">
            Verifiseres av kvalifisert person før bruk i samsvarserklæring.
          </p>
        )}
      </div>
    </div>
  );
}
