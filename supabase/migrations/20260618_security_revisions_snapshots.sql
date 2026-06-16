-- Prompt 18: Sikkerhet, team-RLS, revisjonssyklus-grenser, dokument-snapshots
-- Kjør manuelt i Supabase SQL Editor (ikke auto-kjørt).

-- ============================================================
-- A2: increment_project_count — kun service_role
-- ============================================================
create or replace function public.increment_project_count(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if auth.uid() is null or auth.uid() is distinct from user_id then
      raise exception 'Forbidden: cannot increment project count for another user';
    end if;
  end if;

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

revoke execute on function public.increment_project_count(uuid) from authenticated;
revoke execute on function public.increment_project_count(uuid) from public;
grant execute on function public.increment_project_count(uuid) to service_role;

-- ============================================================
-- A1: uploaded_documents — opprett tabell + RLS
-- (Kjør patch-uploaded-documents.sql først hvis du vil ha egen fil;
--  denne blokken gjør det idempotent slik migreringen ikke feiler.)
-- ============================================================
create table if not exists public.uploaded_documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  document_id text not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz default now(),
  superseded_at timestamptz,
  is_current boolean not null default true
);

create index if not exists uploaded_documents_project_doc_idx
  on public.uploaded_documents(project_id, document_id, uploaded_at desc);

create index if not exists uploaded_documents_project_current_idx
  on public.uploaded_documents(project_id, document_id)
  where is_current = true;

alter table public.uploaded_documents enable row level security;

drop policy if exists "uploaded_documents_supplier_select" on public.uploaded_documents;
create policy "uploaded_documents_supplier_select"
  on public.uploaded_documents for select
  using (public.supplier_can_access_project(project_id));

drop policy if exists "uploaded_documents_supplier_write" on public.uploaded_documents;
create policy "uploaded_documents_supplier_write"
  on public.uploaded_documents for all
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

-- ============================================================
-- A3: Stram team_members INSERT — krever gyldig invitasjon
-- ============================================================
drop policy if exists "team_members_self_accept" on public.team_members;

drop policy if exists "team_members_invite_accept" on public.team_members;
create policy "team_members_invite_accept"
  on public.team_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.team_invitations ti
      join public.users u on u.id = auth.uid()
      where ti.company_id = team_members.company_id
        and lower(ti.email) = lower(u.email)
        and ti.status = 'pending'
        and ti.expires_at > now()
        and ti.role = team_members.role
    )
  );

-- ============================================================
-- A4: Maks én locked-syklus per prosjekt
-- ============================================================
create unique index if not exists idx_one_locked_cycle_per_project
  on public.project_revision_cycles(project_id)
  where status = 'locked';

-- ============================================================
-- A5: Dokument-snapshots ved låsing
-- ============================================================
create table if not exists public.revision_cycle_document_snapshots (
  id uuid default gen_random_uuid() primary key,
  revision_cycle_id uuid not null references public.project_revision_cycles(id) on delete cascade,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  document_id text not null,
  label text not null,
  filename text,
  content_html text not null default '',
  content_hash text not null,
  status text not null default 'complete',
  created_at timestamptz default now(),
  unique (revision_cycle_id, document_id)
);

create index if not exists idx_revision_cycle_snapshots_cycle
  on public.revision_cycle_document_snapshots(revision_cycle_id);

create index if not exists idx_revision_cycle_snapshots_project
  on public.revision_cycle_document_snapshots(project_id);

alter table public.revision_cycle_document_snapshots enable row level security;

drop policy if exists "snapshots_supplier_access" on public.revision_cycle_document_snapshots;
create policy "snapshots_supplier_access"
  on public.revision_cycle_document_snapshots for all
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

drop policy if exists "snapshots_customer_read" on public.revision_cycle_document_snapshots;
create policy "snapshots_customer_read"
  on public.revision_cycle_document_snapshots for select
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

-- ============================================================
-- B1: Team-RLS på prosjekter, dokumenter, document_revisions
-- ============================================================
drop policy if exists "prosjekter_all_own" on public.prosjekter;

drop policy if exists "prosjekter_supplier_select" on public.prosjekter;
create policy "prosjekter_supplier_select"
  on public.prosjekter for select
  using (public.supplier_can_access_project(id));

drop policy if exists "prosjekter_supplier_insert" on public.prosjekter;
create policy "prosjekter_supplier_insert"
  on public.prosjekter for insert
  with check (user_id = auth.uid());

drop policy if exists "prosjekter_supplier_update" on public.prosjekter;
create policy "prosjekter_supplier_update"
  on public.prosjekter for update
  using (public.supplier_can_access_project(id))
  with check (public.supplier_can_access_project(id));

drop policy if exists "prosjekter_supplier_delete" on public.prosjekter;
create policy "prosjekter_supplier_delete"
  on public.prosjekter for delete
  using (user_id = auth.uid());

drop policy if exists "dokumenter_all_own" on public.dokumenter;

drop policy if exists "dokumenter_supplier_access" on public.dokumenter;
create policy "dokumenter_supplier_access"
  on public.dokumenter for all
  using (
    exists (
      select 1 from public.prosjekter p
      where p.id = prosjekt_id
        and public.supplier_can_access_project(p.id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prosjekter p
      where p.id = prosjekt_id
        and public.supplier_can_access_project(p.id)
    )
  );

drop policy if exists "document_revisions_select_own_projects" on public.document_revisions;
drop policy if exists "document_revisions_insert_own_projects" on public.document_revisions;

drop policy if exists "document_revisions_supplier_select" on public.document_revisions;
create policy "document_revisions_supplier_select"
  on public.document_revisions for select
  using (public.supplier_can_access_project(project_id));

drop policy if exists "document_revisions_supplier_insert" on public.document_revisions;
create policy "document_revisions_supplier_insert"
  on public.document_revisions for insert
  with check (public.supplier_can_access_project(project_id));

drop policy if exists "document_revisions_supplier_update" on public.document_revisions;
create policy "document_revisions_supplier_update"
  on public.document_revisions for update
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

-- ============================================================
-- B2: Unik e-postdomene + transaksjonell kunde-kobling (RPC)
-- ============================================================
create unique index if not exists idx_customer_organizations_email_domain_unique
  on public.customer_organizations(email_domain)
  where email_domain is not null;

create or replace function public.link_customer_access_for_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text default null,
  p_force boolean default false
)
returns table (organization_id uuid, customer_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_domain text;
  v_org_id uuid;
  v_customer_user_id uuid;
  v_has_pending boolean := false;
  v_org_name text;
  v_member_count integer;
  v_activated_at timestamptz := now();
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return;
  end if;

  v_domain := split_part(v_email, '@', 2);

  select cu.id, cu.customer_organization_id
  into v_customer_user_id, v_org_id
  from public.customer_users cu
  where cu.auth_user_id = p_auth_user_id
    and cu.customer_organization_id is not null
  limit 1;

  if v_customer_user_id is not null and not p_force then
    organization_id := v_org_id;
    customer_user_id := v_customer_user_id;
    return next;
    return;
  end if;

  select exists (
    select 1 from public.customer_project_access cpa
    where lower(cpa.invited_email) = v_email
      and cpa.status = 'pending'
  )
  or (
    v_domain <> ''
    and exists (
      select 1 from public.customer_project_access cpa
      where lower(cpa.invited_email) like '%@' || v_domain
        and cpa.status = 'pending'
    )
  )
  into v_has_pending;

  if not p_force and v_customer_user_id is null and not v_has_pending then
    return;
  end if;

  if v_domain <> '' then
    select co.id into v_org_id
    from public.customer_organizations co
    where co.email_domain = v_domain
    limit 1;
  end if;

  if v_org_id is null then
    select cpa.customer_organization_id into v_org_id
    from public.customer_project_access cpa
    where lower(cpa.invited_email) = v_email
      and cpa.customer_organization_id is not null
    limit 1;
  end if;

  if v_org_id is null then
    v_org_name := coalesce(
      initcap(split_part(v_domain, '.', 1)),
      v_email
    );
    begin
      insert into public.customer_organizations(name, email_domain)
      values (v_org_name, nullif(v_domain, ''))
      returning id into v_org_id;
    exception
      when unique_violation then
        select co.id into v_org_id
        from public.customer_organizations co
        where co.email_domain = v_domain
        limit 1;
    end;

    if v_org_id is null then
      select co.id into v_org_id
      from public.customer_organizations co
      where co.email_domain = v_domain
      limit 1;
    end if;
  end if;

  select cu.id into v_customer_user_id
  from public.customer_users cu
  where cu.auth_user_id = p_auth_user_id
    and cu.customer_organization_id = v_org_id
  limit 1;

  if v_customer_user_id is null then
    select count(*) into v_member_count
    from public.customer_users cu
    where cu.customer_organization_id = v_org_id;

    insert into public.customer_users(
      auth_user_id,
      customer_organization_id,
      email,
      full_name,
      role
    )
    values (
      p_auth_user_id,
      v_org_id,
      v_email,
      p_full_name,
      case when v_member_count = 0 then 'admin' else 'member' end
    )
    returning id into v_customer_user_id;
  elsif p_full_name is not null then
    update public.customer_users
    set full_name = p_full_name
    where id = v_customer_user_id;
  end if;

  update public.customer_project_access
  set
    status = 'active',
    customer_organization_id = v_org_id,
    customer_user_id = v_customer_user_id,
    activated_at = v_activated_at
  where lower(invited_email) = v_email
    and status = 'pending';

  if v_domain <> '' then
    update public.customer_project_access
    set customer_organization_id = v_org_id
    where customer_organization_id is null
      and lower(invited_email) like '%@' || v_domain;
  end if;

  organization_id := v_org_id;
  customer_user_id := v_customer_user_id;
  return next;
end;
$$;

revoke execute on function public.link_customer_access_for_user(uuid, text, text, boolean) from public;
grant execute on function public.link_customer_access_for_user(uuid, text, text, boolean) to service_role;

-- ============================================================
-- C5: customer_notifications UPDATE — kun eget eller org-bredt (NULL user)
-- ============================================================
drop policy if exists "Customer users can update their own notifications" on public.customer_notifications;

drop policy if exists "Customer users can mark notifications read" on public.customer_notifications;
create policy "Customer users can mark notifications read"
  on public.customer_notifications for update
  using (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
    and (
      customer_user_id is null
      or customer_user_id in (
        select id from public.customer_users
        where auth_user_id = auth.uid()
      )
    )
  )
  with check (
    customer_organization_id in (
      select customer_organization_id from public.customer_users
      where auth_user_id = auth.uid()
    )
    and (
      customer_user_id is null
      or customer_user_id in (
        select id from public.customer_users
        where auth_user_id = auth.uid()
      )
    )
  );
