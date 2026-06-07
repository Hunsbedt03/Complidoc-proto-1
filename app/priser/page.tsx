'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { PLANS, formatNok, type BillingCycle, type PlanId } from '@/lib/plans';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l3 3 5-5"
        stroke="#619922"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('payment') === 'cancelled';
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  async function handleSubscribe(plan: PlanId) {
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle: billing }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        if (res.status === 401) {
          router.push('/login?redirect=/priser');
          return;
        }
        alert(json.error ?? 'Kunne ikke starte checkout');
        return;
      }
      window.location.href = json.url;
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="pricing-page">
      <header className="pricing-page-header">
        <Link href="/" className="pricing-back">
          ← Samsiq
        </Link>
        <h1>Velg din plan</h1>
        <p className="pricing-page-lead">
          14 dagers gratis prøveperiode. Ingen kredittkort kreves for å starte.
        </p>
        {cancelled ? (
          <p className="pricing-cancelled">Betaling avbrutt — du kan prøve igjen når som helst.</p>
        ) : null}
      </header>

      <div className="billing-toggle" role="group" aria-label="Faktureringsperiode">
        <button
          type="button"
          className={'billing-toggle-btn' + (billing === 'monthly' ? ' on' : '')}
          onClick={() => setBilling('monthly')}
        >
          Månedlig
        </button>
        <button
          type="button"
          className={'billing-toggle-btn' + (billing === 'yearly' ? ' on' : '')}
          onClick={() => setBilling('yearly')}
        >
          Årlig
          <span className="billing-save-badge">Spar 25%</span>
        </button>
      </div>

      <div className="pricing-grid pricing-grid--two">
        {(['starter', 'pro'] as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const price =
            billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const period = billing === 'monthly' ? '/mnd' : '/år';
          const featured = planId === 'pro';

          return (
            <div
              key={planId}
              className={'price-card' + (featured ? ' featured' : '')}
            >
              {featured ? <div className="price-badge">Mest populær</div> : null}
              <div className="price-name">{plan.name}</div>
              <div className="price-desc">
                {planId === 'starter' ? 'For små bedrifter' : 'For voksende bedrifter'}
              </div>
              <div>
                <span className="price-amount">{formatNok(price).replace(' kr', '')}</span>
                <span className="price-period"> kr{period}</span>
              </div>
              <div className="price-divider" />
              {plan.features.map((f) => (
                <div key={f} className="price-feature">
                  <div className="pf-check">
                    <CheckIcon />
                  </div>
                  {f}
                </div>
              ))}
              <button
                type="button"
                className={'price-btn ' + (featured ? 'btn-filled' : 'btn-outline')}
                disabled={loadingPlan === planId}
                onClick={() => void handleSubscribe(planId)}
              >
                {loadingPlan === planId
                  ? 'Åpner Stripe…'
                  : 'Start gratis prøveperiode'}
              </button>
              <p className="price-trial-note">14 dagers gratis prøveperiode</p>
              <p className="price-trial-note">Ingen kredittkort kreves</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PriserPage() {
  return (
    <Suspense fallback={<p className="pricing-page">Laster…</p>}>
      <PricingContent />
    </Suspense>
  );
}
