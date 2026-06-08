-- Onboarding + bedriftsprofil (Prompt 7)
alter table public.users
  add column if not exists onboarding_completed boolean default false;

create table if not exists public.company_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade unique,
  company_name text not null,
  org_number text,
  address text,
  postal_code text,
  city text,
  country text default 'Norge',
  responsible_engineer text,
  engineer_title text,
  phone text,
  website text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists company_profiles_user_idx on public.company_profiles(user_id);

alter table public.company_profiles enable row level security;

create policy "company_profiles_own" on public.company_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Eksisterende brukere hopper over onboarding
update public.users set onboarding_completed = true where onboarding_completed = false;
