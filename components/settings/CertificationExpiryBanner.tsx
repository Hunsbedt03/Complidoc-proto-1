'use client';

import Link from 'next/link';
import { ISO_LABELS } from '@/lib/companyProfile/extended';
import type { CompanyCertification } from '@/lib/types';

type Props = {
  expiringCerts: CompanyCertification[];
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO');
}

export function CertificationExpiryBanner({ expiringCerts }: Props) {
  if (!expiringCerts.length) return null;

  return (
    <div className="cert-expiry-card" role="alert">
      <div className="cert-expiry-card-head">
        <span className="cert-expiry-card-icon" aria-hidden>
          ⚠️
        </span>
        <div>
          <p className="cert-expiry-card-title">
            {expiringCerts.length === 1
              ? '1 ISO-sertifisering utløper snart'
              : `${expiringCerts.length} ISO-sertifiseringer utløper snart`}
          </p>
          <p className="cert-expiry-card-sub">
            Følgende sertifiseringer utløper innen 90 dager:
          </p>
        </div>
      </div>
      <ul className="cert-expiry-card-list">
        {expiringCerts.map((cert, index) => (
          <li key={`${cert.standard}-${index}`}>
            <span className="cert-expiry-card-name">
              {ISO_LABELS[cert.standard] ?? cert.standard}
            </span>
            <span className="cert-expiry-card-date">
              Utløper {formatDate(cert.expiryDate)}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/app/settings#certifications" className="cert-expiry-card-link">
        Oppdater i Innstillinger →
      </Link>
    </div>
  );
}
