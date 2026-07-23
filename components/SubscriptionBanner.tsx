'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type SubscriptionBannerData = {
  enforced: boolean;
  status: string;
  plan: string;
  used: number;
  limit: number;
  trialEnd: string | null;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
};

type Props = {
  data: SubscriptionBannerData | null;
  loading?: boolean;
  /** Etter checkout — skjul «ingen abonnement» mens Stripe synkes */
  pendingActivation?: boolean;
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

async function openPortal(setError: (msg: string) => void): Promise<void> {
  const res = await fetch('/api/stripe/portal', { method: 'POST' });
  const json = (await res.json()) as { url?: string; error?: string };
  if (json.url) {
    window.location.href = json.url;
    return;
  }
  setError(json.error ?? 'Kunne ikke åpne kundeportal');
}

const ACTIVE = new Set(['active', 'trialing']);

export function SubscriptionBanner({ data, loading, pendingActivation }: Props) {
  const router = useRouter();
  const [portalError, setPortalError] = useState<string | null>(null);

  if (pendingActivation) {
    return (
      <div className="sub-banner sub-banner--warning">
        <span>Aktiverer abonnement…</span>
      </div>
    );
  }

  if (loading || !data?.enforced) return null;

  if (data.status === 'trialing') {
    const days = daysUntil(data.trialEnd);
    const expired = days === 0;
    return (
      <div className={'sub-banner ' + (expired ? 'sub-banner--error' : 'sub-banner--warning')}>
        <span>Prøveperiode — {days ?? '?'} dager igjen</span>
        <button type="button" className="btn-dl" onClick={() => void openPortal(setPortalError)}>
          Legg til betalingskort
        </button>
        {portalError ? <p className="form-error">{portalError}</p> : null}
      </div>
    );
  }

  if (data.status === 'active') {
    return null;
  }

  if (
    data.plan === 'starter' &&
    data.limit > 0 &&
    data.used >= data.limit - 1 &&
    data.used < data.limit
  ) {
    return (
      <div className="sub-banner sub-banner--warning">
        <span>
          {data.used}/{data.limit} dokumentpakker brukt denne måneden
        </span>
        <button
          type="button"
          className="btn-dl"
          onClick={() => router.push('/priser')}
        >
          Oppgrader til Pro
        </button>
      </div>
    );
  }

  if (data.status === 'past_due') {
    return (
      <div className="sub-banner sub-banner--error">
        <span>
          Betaling mislyktes — oppdater betalingsinfo for å fortsette
        </span>
        <button type="button" className="btn-dl" onClick={() => void openPortal(setPortalError)}>
          Oppdater kort
        </button>
        {portalError ? <p className="form-error">{portalError}</p> : null}
      </div>
    );
  }

  if (data.status === 'inactive' || data.status === 'canceled') {
    return (
      <div className="sub-banner sub-banner--error">
        <span>Ingen aktivt abonnement — velg en plan for å generere dokumentpakker</span>
        <Link href="/priser" className="btn-dl">
          Se priser
        </Link>
      </div>
    );
  }

  return null;
}

export function isSubscriptionActive(data: SubscriptionBannerData | null): boolean {
  return !!data && ACTIVE.has(data.status);
}
