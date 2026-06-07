import type { PlanId } from '@/lib/plans';

export function getPlanFromPriceId(priceId: string): PlanId | 'free' {
  const starter = [
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  ];
  const pro = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  ];
  if (starter.includes(priceId)) return 'starter';
  if (pro.includes(priceId)) return 'pro';
  return 'free';
}
