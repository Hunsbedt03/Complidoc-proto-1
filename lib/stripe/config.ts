import 'server-only';

import type { BillingCycle, PlanId } from '@/lib/plans';

export type StripeMode = 'live' | 'test' | 'unknown';

const TEST_PRICE_IDS = new Set([
  'price_1Tfems23yykNRNv25PJtPSV4',
  'price_1TfeqW23yykNRNv2HGryOGLq',
  'price_1Tfewo23yykNRNv2N4nkVBkY',
  'price_1Tfexa23yykNRNv2O2tJKfW2',
]);

function keyMode(prefix: string | undefined): StripeMode {
  if (!prefix?.trim()) return 'unknown';
  if (prefix.startsWith('sk_live_') || prefix.startsWith('pk_live_')) return 'live';
  if (prefix.startsWith('sk_test_') || prefix.startsWith('pk_test_')) return 'test';
  return 'unknown';
}

export function getStripeSecretMode(): StripeMode {
  return keyMode(process.env.STRIPE_SECRET_KEY);
}

export function getStripePublishableMode(): StripeMode {
  return keyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getConfiguredPriceIds(): Record<PlanId, Record<BillingCycle, string | undefined>> {
  return {
    starter: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim(),
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim(),
    },
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim(),
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID?.trim(),
    },
  };
}

export type StripeConfigIssue =
  | 'missing_secret_key'
  | 'missing_publishable_key'
  | 'missing_webhook_secret'
  | 'missing_price_id'
  | 'mode_mismatch'
  | 'test_price_in_live_mode';

export function getStripeConfigIssues(): StripeConfigIssue[] {
  const issues: StripeConfigIssue[] = [];
  const secretMode = getStripeSecretMode();
  const publishableMode = getStripePublishableMode();

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    issues.push('missing_secret_key');
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    issues.push('missing_publishable_key');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    issues.push('missing_webhook_secret');
  }

  const prices = getConfiguredPriceIds();
  for (const plan of ['starter', 'pro'] as const) {
    for (const cycle of ['monthly', 'yearly'] as const) {
      if (!prices[plan][cycle]) {
        issues.push('missing_price_id');
        break;
      }
    }
  }

  if (
    secretMode !== 'unknown' &&
    publishableMode !== 'unknown' &&
    secretMode !== publishableMode
  ) {
    issues.push('mode_mismatch');
  }

  if (secretMode === 'live') {
    const livePriceIds = Object.values(prices)
      .flatMap((p) => [p.monthly, p.yearly])
      .filter((id): id is string => !!id);
    if (livePriceIds.some((id) => TEST_PRICE_IDS.has(id))) {
      issues.push('test_price_in_live_mode');
    }
  }

  return [...new Set(issues)];
}

export function isStripeLiveReady(): boolean {
  return getStripeConfigIssues().length === 0 && getStripeSecretMode() === 'live';
}
