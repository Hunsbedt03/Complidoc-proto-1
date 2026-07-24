-- Samsiq database schema (kjernemodell)
-- Kjør i Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- Utvidelser (company_profiles, kundeportal, revisjoner, kravmal, …) ligger i
-- supabase/migrations/ og supabase/patch-*.sql.
--
-- S3 (2026-07-24): legacy bedrifter / brukere_bedrifter er fjernet.
-- Org-/team-modell: public.company_profiles (+ team_members).

-- ─── Profiler (koblet til Supabase Auth) ───────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- ─── Maskiner (legacy/tom i prod — beholdt for mulig fremtidig bruk) ───────
create table if not exists public.maskiner (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  navn text not null,
  serienummer text,
  beskrivelse text,
  drivsystem text,
  styring text,
  installasjonsmiljo text,
  tiltenkt_bruk text,
  standarder text,
  marked text,
  created_at timestamptz not null default now()
);

-- ─── Prosjekter ────────────────────────────────────────────────────────────
-- company_profile_id er NOT NULL i prod (FK til company_profiles via migrering).
-- Her uten FK slik at denne filen kan kjøres før company_profiles-patch.
create table if not exists public.prosjekter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_profile_id uuid not null,
  maskin_id uuid references public.maskiner(id) on delete set null,
  navn text not null,
  kunde text,
  produsent text,
  ingenior text,
  status text not null default 'fullført' check (status in ('utkast', 'pågår', 'fullført')),
  machine_data text,
  zip_filename text,
  zip_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Dokumenter ────────────────────────────────────────────────────────────
create table if not exists public.dokumenter (
  id uuid primary key default gen_random_uuid(),
  prosjekt_id uuid not null references public.prosjekter(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  doc_type text not null check (char_length(doc_type) >= 1 and char_length(doc_type) <= 64),
  filename text not null,
  docx_base64 text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_prosjekter_user on public.prosjekter(user_id, created_at desc);
create index if not exists idx_prosjekter_company_profile on public.prosjekter(company_profile_id);
create index if not exists idx_dokumenter_prosjekt on public.dokumenter(prosjekt_id);
create index if not exists idx_maskiner_user on public.maskiner(user_id);

-- ─── Auto-opprett profil ved registrering ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sikrer public.users-rad for innlogget bruker (omgår RLS ved første lagring)
create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  into v_email, v_name
  from auth.users
  where id = auth.uid();
  insert into public.users (id, email, full_name)
  values (auth.uid(), coalesce(v_email, ''), v_name)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.maskiner enable row level security;
alter table public.prosjekter enable row level security;
alter table public.dokumenter enable row level security;

-- users
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- maskiner
create policy "maskiner_all_own" on public.maskiner for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- prosjekter
create policy "prosjekter_all_own" on public.prosjekter for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- dokumenter
create policy "dokumenter_all_own" on public.dokumenter for all using (user_id = auth.uid()) with check (user_id = auth.uid());
