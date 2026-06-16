'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  SubscriptionBanner,
  type SubscriptionBannerData,
} from '@/components/SubscriptionBanner';
import { useAuth } from '@/components/providers/AuthProvider';

/** Abonnementsbanner på tvers av alle leverandør-sider (ikke kun dashboard). */
export function GlobalSubscriptionBanner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const [subscription, setSubscription] = useState<SubscriptionBannerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(paymentSuccess);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setPendingActivation(false);
      return;
    }

    let cancelled = false;

    async function loadStatus(syncFromStripe: boolean): Promise<SubscriptionBannerData | null> {
      setLoading(true);
      try {
        const url = syncFromStripe ? '/api/subscription/sync' : '/api/subscription/status';
        const res = await fetch(url, { method: syncFromStripe ? 'POST' : 'GET' });
        if (!res.ok || cancelled) return null;
        const json = (await res.json()) as SubscriptionBannerData;
        if (!cancelled) setSubscription(json);
        return json;
      } catch {
        if (!cancelled) setSubscription(null);
        return null;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (paymentSuccess) {
      void loadStatus(true).then((json) => {
        if (json && (json.status === 'active' || json.status === 'trialing')) {
          setPendingActivation(false);
        }
      });
    } else {
      void loadStatus(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user, paymentSuccess]);

  if (!user) return null;

  return (
    <SubscriptionBanner
      data={subscription}
      loading={loading}
      pendingActivation={pendingActivation}
    />
  );
}
