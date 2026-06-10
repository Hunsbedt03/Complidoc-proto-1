-- Prompt 11: Flerbruker-støtte (team_members + team_invitations)
-- Kjør etter patch-onboarding.sql og patch-company-profile-extended.sql

alter table public.users
  add column if not exists company_id uuid references public.company_profiles(id) on delete set null;

create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'engineer',
  invited_by uuid references public.users(id) on delete set null,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  last_active_at timestamptz default now(),
  status text not null default 'pending',
  unique(company_id, user_id)
);

create table if not exists public.team_invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  email text not null,
  role text not null default 'engineer',
  token text unique not null default gen_random_uuid()::text,
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  accepted_at timestamptz,
  status text not null default 'pending'
);

create index if not exists team_members_company_status_idx
  on public.team_members(company_id, status);
create index if not exists team_members_user_status_idx
  on public.team_members(user_id, status);
create index if not exists team_invitations_token_status_idx
  on public.team_invitations(token, status);
create index if not exists team_invitations_email_status_idx
  on public.team_invitations(email, status);

alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

-- Unngår RLS-rekursjon ved oppslag i team_members
create or replace function public.user_active_company_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.team_members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.user_admin_company_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.team_members
  where user_id = auth.uid()
    and role in ('owner', 'admin')
    and status = 'active';
$$;

drop policy if exists "team_members_company" on public.team_members;
create policy "team_members_company" on public.team_members
  for select using (company_id in (select public.user_active_company_ids()));

create policy "team_members_admin_write" on public.team_members
  for all using (company_id in (select public.user_admin_company_ids()))
  with check (company_id in (select public.user_admin_company_ids()));

create policy "team_members_self_accept" on public.team_members
  for insert with check (user_id = auth.uid());

drop policy if exists "team_invitations_admin" on public.team_invitations;
create policy "team_invitations_admin" on public.team_invitations
  for all using (company_id in (select public.user_admin_company_ids()))
  with check (company_id in (select public.user_admin_company_ids()));

-- Utvid company_profiles: teammedlemmer kan lese, owner/admin kan skrive
drop policy if exists "company_profiles_own" on public.company_profiles;
drop policy if exists "company_profiles_team_read" on public.company_profiles;
drop policy if exists "company_profiles_team_write" on public.company_profiles;

create policy "company_profiles_team_read" on public.company_profiles
  for select using (
    user_id = auth.uid()
    or id in (select public.user_active_company_ids())
  );

create policy "company_profiles_team_write" on public.company_profiles
  for all using (
    user_id = auth.uid()
    or id in (select public.user_admin_company_ids())
  )
  with check (
    user_id = auth.uid()
    or id in (select public.user_admin_company_ids())
  );

-- Backfill: eksisterende profil-eiere blir team-eiere
insert into public.team_members (company_id, user_id, role, status, accepted_at, last_active_at)
select cp.id, cp.user_id, 'owner', 'active', now(), now()
from public.company_profiles cp
where not exists (
  select 1 from public.team_members tm
  where tm.company_id = cp.id and tm.user_id = cp.user_id
);

update public.users u
set company_id = cp.id
from public.company_profiles cp
where cp.user_id = u.id and u.company_id is null;

update public.users u
set company_id = tm.company_id
from public.team_members tm
where tm.user_id = u.id and tm.status = 'active' and u.company_id is null;
