import { NextResponse } from 'next/server';
import {
  getConfiguredPriceIds,
  getStripeConfigIssues,
  getStripePublishableMode,
  getStripeSecretMode,
  isStripeLiveReady,
} from '@/lib/stripe/config';
import { getAppUrl } from '@/lib/appUrl';

export async function GET() {
  const issues = getStripeConfigIssues();
  const prices = getConfiguredPriceIds();

  return NextResponse.json({
    configured: issues.length === 0,
    liveReady: isStripeLiveReady(),
    mode: {
      secret: getStripeSecretMode(),
      publishable: getStripePublishableMode(),
    },
    appUrl: getAppUrl(),
    webhookEndpoint: `${getAppUrl().replace(/\/$/, '')}/api/stripe/webhook`,
    portalReturnUrl: `${getAppUrl().replace(/\/$/, '')}/app/dashboard`,
    prices: {
      starter: {
        monthly: maskPriceId(prices.starter.monthly),
        yearly: maskPriceId(prices.starter.yearly),
      },
      pro: {
        monthly: maskPriceId(prices.pro.monthly),
        yearly: maskPriceId(prices.pro.yearly),
      },
    },
    issues,
    hints: issueHints(issues),
  });
}

function maskPriceId(id: string | undefined): string | null {
  if (!id) return null;
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function issueHints(issues: ReturnType<typeof getStripeConfigIssues>): string[] {
  const hints: string[] = [];
  if (issues.includes('mode_mismatch')) {
    hints.push(
      'STRIPE_SECRET_KEY og NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY må begge være live eller begge test.'
    );
  }
  if (issues.includes('test_price_in_live_mode')) {
    hints.push(
      'Du bruker test Price IDs med sk_live_ — opprett nye priser i Stripe live-modus og oppdater STRIPE_*_PRICE_ID.'
    );
  }
  if (issues.includes('missing_webhook_secret')) {
    const webhookUrl = `${getAppUrl().replace(/\/$/, '')}/api/stripe/webhook`;
    hints.push(
      `Opprett live webhook på ${webhookUrl} og sett STRIPE_WEBHOOK_SECRET.`
    );
  }
  return hints;
}
