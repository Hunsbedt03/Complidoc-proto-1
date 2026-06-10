export type PlanId = 'starter' | 'pro';

export type BillingCycle = 'monthly' | 'yearly';

export const PLANS = {
  starter: {
    id: 'starter' as const,
    name: 'Starter',
    monthlyPrice: 990,
    yearlyPrice: 8900,
    currency: 'nok',
    features: [
      '5 dokumentpakker per måned',
      'Alle AI-dokumenttyper',
      'PDF og DOCX eksport',
      'Revisjonshistorikk',
      'E-post support',
    ],
    limits: {
      projectsPerMonth: 5,
      teamMembers: 2,
    },
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 2490,
    yearlyPrice: 21900,
    currency: 'nok',
    features: [
      'Ubegrenset dokumentpakker',
      'Alle AI-dokumenttyper',
      'PDF, DOCX og ZIP eksport',
      'Full revisjonshistorikk',
      'Prioritert support',
      'Flere brukere (inntil 10)',
      'Tilpasset bedriftslogo i dokumenter',
    ],
    limits: {
      projectsPerMonth: -1,
      teamMembers: 10,
    },
  },
} as const;

export function getPriceId(plan: PlanId, billing: BillingCycle): string | undefined {
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    starter: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    },
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
  };
  return map[plan][billing];
}

export function formatNok(amount: number): string {
  return amount.toLocaleString('nb-NO') + ' kr';
}
