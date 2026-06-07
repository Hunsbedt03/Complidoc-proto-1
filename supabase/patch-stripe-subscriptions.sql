-- Stripe-abonnement på brukerprofiler (Prompt 6)
alter table public.users add column if not exists stripe_customer_id text;
alter table public.users add column if not exists stripe_subscription_id text;
alter table public.users add column if not exists subscription_status text default 'inactive';
alter table public.users add column if not exists subscription_plan text default 'free';
alter table public.users add column if not exists subscription_period_end timestamptz;
alter table public.users add column if not exists trial_end timestamptz;
alter table public.users add column if not exists projects_used_this_month integer default 0;
alter table public.users add column if not exists projects_reset_at timestamptz default now();

create or replace function public.increment_project_count(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    projects_used_this_month = case
      when date_trunc('month', projects_reset_at) < date_trunc('month', now())
      then 1
      else projects_used_this_month + 1
    end,
    projects_reset_at = case
      when date_trunc('month', projects_reset_at) < date_trunc('month', now())
      then now()
      else projects_reset_at
    end
  where id = user_id;
end;
$$;

grant execute on function public.increment_project_count(uuid) to authenticated;
grant execute on function public.increment_project_count(uuid) to service_role;
