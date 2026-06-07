import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANS, type PlanId } from '@/lib/plans';
import { createAdminClient } from '@/lib/supabase/admin';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'inactive';

export type UserSubscriptionRow = {
  subscription_plan: string | null;
  subscription_status: string | null;
  projects_used_this_month: number | null;
  trial_end: string | null;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
};

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);

export function isSubscriptionEnforced(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export async function fetchUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscriptionRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'subscription_plan, subscription_status, projects_used_this_month, trial_end, subscription_period_end, stripe_customer_id'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? error);
    if (
      msg.includes('subscription_plan') ||
      msg.includes('42703') ||
      msg.includes('PGRST204')
    ) {
      return null;
    }
    throw error;
  }
  return data as UserSubscriptionRow | null;
}

export async function checkSubscriptionActive(userId: string): Promise<{
  active: boolean;
  reason?: string;
  profile: UserSubscriptionRow | null;
}> {
  if (!isSubscriptionEnforced()) {
    return { active: true, profile: null };
  }

  const admin = createAdminClient();
  const supabase = admin;
  if (!supabase) {
    return { active: true, profile: null };
  }

  const profile = await fetchUserSubscription(supabase, userId);
  if (!profile) {
    return {
      active: false,
      reason: 'Abonnementsoppsett mangler — kjør supabase/patch-stripe-subscriptions.sql',
      profile: null,
    };
  }

  const status = (profile.subscription_status ?? 'inactive') as SubscriptionStatus;
  if (!ACTIVE_STATUSES.has(status)) {
    return {
      active: false,
      reason: 'Ingen aktivt abonnement — velg en plan på /priser',
      profile,
    };
  }

  return { active: true, profile };
}

export async function checkProjectLimit(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
  plan: PlanId | 'free';
  status: SubscriptionStatus;
}> {
  if (!isSubscriptionEnforced()) {
    return { allowed: true, used: 0, limit: -1, plan: 'pro', status: 'active' };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { allowed: true, used: 0, limit: -1, plan: 'pro', status: 'active' };
  }

  const profile = await fetchUserSubscription(admin, userId);
  if (!profile) {
    return {
      allowed: false,
      reason: 'Abonnementsoppsett mangler i databasen',
      used: 0,
      limit: 0,
      plan: 'free',
      status: 'inactive',
    };
  }

  const status = (profile.subscription_status ?? 'inactive') as SubscriptionStatus;
  const plan = (profile.subscription_plan ?? 'free') as PlanId | 'free';
  const used = profile.projects_used_this_month ?? 0;

  if (!ACTIVE_STATUSES.has(status)) {
    return {
      allowed: false,
      reason: 'Ingen aktivt abonnement',
      used,
      limit: 0,
      plan,
      status,
    };
  }

  if (plan === 'pro') {
    return { allowed: true, used, limit: -1, plan, status };
  }

  if (plan === 'starter') {
    const limit = PLANS.starter.limits.projectsPerMonth;
    if (used >= limit) {
      return {
        allowed: false,
        reason: `Du har brukt ${used}/${limit} dokumentpakker denne måneden`,
        used,
        limit,
        plan,
        status,
      };
    }
    return { allowed: true, used, limit, plan, status };
  }

  return {
    allowed: false,
    reason: 'Oppgrader for å generere dokumentpakker',
    used,
    limit: 0,
    plan,
    status,
  };
}

export async function incrementProjectCount(userId: string): Promise<void> {
  if (!isSubscriptionEnforced()) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { error } = await admin.rpc('increment_project_count', { user_id: userId });
  if (error) {
    const msg = String(error.message ?? error);
    if (msg.includes('increment_project_count') || msg.includes('42883')) {
      return;
    }
    throw error;
  }
}
