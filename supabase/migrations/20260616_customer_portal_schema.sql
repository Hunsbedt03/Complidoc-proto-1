-- Prompt 14: Kunde-portal — database-fundament
-- Kjør i Supabase SQL Editor eller via: npx supabase db push

-- ============================================================
-- KUNDE-ORGANISASJONER
-- ============================================================
create table if not exists public.customer_organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email_domain text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_customer_organizations_email_domain
  on public.customer_organizations(email_domain);

-- ============================================================
-- KUNDEBRUKERE
-- ============================================================
create table if not exists public.customer_users (
  id uuid default gen_random_uuid() primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  customer_organization_id uuid not null references public.customer_organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique (auth_user_id, customer_organization_id)
);

create index if not exists idx_customer_users_auth_user_id
  on public.customer_users(auth_user_id);

create index if not exists idx_customer_users_email
  on public.customer_users(email);

-- ============================================================
-- PROSJEKT-TILGANGER FOR KUNDER (invitasjon + selvregistrering)
-- ============================================================
create table if not exists public.customer_project_access (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  invited_email text not null,
  customer_organization_id uuid references public.customer_organizations(id) on delete cascade,
  customer_user_id uuid references public.customer_users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  activated_at timestamptz,
  unique (project_id, invited_email)
);

create index if not exists idx_customer_project_access_project_id
  on public.customer_project_access(project_id);

create index if not exists idx_customer_project_access_org_id
  on public.customer_project_access(customer_organization_id);

create index if not exists idx_customer_project_access_email
  on public.customer_project_access(invited_email);

-- ============================================================
-- REVISJONSSYKLUSER (lås/signerings-historikk per prosjekt)
-- ============================================================
create table if not exists public.project_revision_cycles (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  cycle_number integer not null,
  status text not null default 'open' check (
    status in ('open', 'locked', 'fully_signed', 'superseded')
  ),
  supplier_locked_at timestamptz,
  supplier_signed_by uuid references auth.users(id),
  supplier_signed_by_name text,
  supplier_signed_at timestamptz,
  customer_signed_by uuid references public.customer_users(id),
  customer_signed_by_name text,
  customer_signed_at timestamptz,
  supplier_signature_method text default 'simple' check (supplier_signature_method in ('simple', 'bankid')),
  customer_signature_method text default 'simple' check (customer_signature_method in ('simple', 'bankid')),
  supplier_signature_metadata jsonb,
  customer_signature_metadata jsonb,
  reopened_reason text,
  reopened_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, cycle_number)
);

create index if not exists idx_project_revision_cycles_project_id
  on public.project_revision_cycles(project_id);

create index if not exists idx_project_revision_cycles_status
  on public.project_revision_cycles(status);

create unique index if not exists idx_one_open_cycle_per_project
  on public.project_revision_cycles(project_id)
  where status = 'open';

-- ============================================================
-- VARSLER TIL KUNDER
-- ============================================================
create table if not exists public.customer_notifications (
  id uuid default gen_random_uuid() primary key,
  customer_user_id uuid references public.customer_users(id) on delete cascade,
  customer_organization_id uuid not null references public.customer_organizations(id) on delete cascade,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  revision_cycle_id uuid references public.project_revision_cycles(id) on delete cascade,
  type text not null check (type in (
    'package_ready_for_review',
    'revision_opened',
    'revision_ready_for_review'
  )),
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_customer_notifications_org_id
  on public.customer_notifications(customer_organization_id);

create index if not exists idx_customer_notifications_customer_user_id
  on public.customer_notifications(customer_user_id);

-- ============================================================
-- Hjelpefunksjon: leverandør-tilgang til prosjekt
-- (prosjekter har user_id, ikke company_id — tilpasset Samsiq-skjema)
-- ============================================================
create or replace function public.supplier_can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prosjekter p
    where p.id = p_project_id
      and (
        p.user_id = auth.uid()
        or exists (
          select 1
          from public.team_members tm_viewer
          join public.team_members tm_owner on tm_owner.user_id = p.user_id
          where tm_viewer.user_id = auth.uid()
            and tm_viewer.status = 'active'
            and tm_owner.status = 'active'
            and tm_viewer.company_id = tm_owner.company_id
        )
      )
  );
$$;

grant execute on function public.supplier_can_access_project(uuid) to authenticated;

-- ============================================================
-- RLS — KUNDE-TABELLER
-- ============================================================
alter table public.customer_organizations enable row level security;
alter table public.customer_users enable row level security;
alter table public.customer_project_access enable row level security;
alter table public.project_revision_cycles enable row level security;
alter table public.customer_notifications enable row level security;

drop policy if exists "Customer users can view their own organization" on public.customer_organizations;
create policy "Customer users can view their own organization"
  on public.customer_organizations for select
  using (
    id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
  );

drop policy if exists "Customer users can view colleagues in same organization" on public.customer_users;
create policy "Customer users can view colleagues in same organization"
  on public.customer_users for select
  using (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
  );

drop policy if exists "Customer users can view their organization's project access" on public.customer_project_access;
create policy "Customer users can view their organization's project access"
  on public.customer_project_access for select
  using (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
  );

drop policy if exists "Supplier users can manage access for their projects" on public.customer_project_access;
create policy "Supplier users can manage access for their projects"
  on public.customer_project_access for all
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

drop policy if exists "Customer users can view revision cycles for accessible projects" on public.project_revision_cycles;
create policy "Customer users can view revision cycles for accessible projects"
  on public.project_revision_cycles for select
  using (
    project_id in (
      select project_id from public.customer_project_access
      where status = 'active'
        and customer_organization_id in (
          select customer_organization_id from public.customer_users
          where auth_user_id = auth.uid()
        )
    )
  );

drop policy if exists "Supplier users can manage revision cycles for their projects" on public.project_revision_cycles;
create policy "Supplier users can manage revision cycles for their projects"
  on public.project_revision_cycles for all
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

drop policy if exists "Customer users can view their organization's notifications" on public.customer_notifications;
create policy "Customer users can view their organization's notifications"
  on public.customer_notifications for select
  using (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
  );

drop policy if exists "Customer users can update their own notifications" on public.customer_notifications;
create policy "Customer users can update their own notifications"
  on public.customer_notifications for update
  using (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
  );
