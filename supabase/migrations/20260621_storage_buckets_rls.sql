-- Prompt 21: Supabase Storage — private buckets + RLS
-- Kjør manuelt i Supabase SQL Editor (ikke auto-kjørt).
--
-- FORUTSETNINGER:
--   - public.supplier_can_access_project(uuid)  (20260616_customer_portal_schema.sql)
--   - public.company_profiles, public.team_members
--   - public.customer_project_access, public.customer_users
--   - public.company_archive, public.project_archive_links (for kunde-lesing av arkiv)
--
-- KODEBASEN BRUKER NØYAKTIG DISSE TO BUCKETENE (admin.storage.from):
--   1. project-documents  — opplastede prosjektfiler (CAD, tegninger, …)
--      Sti: {project_id}/{document_id}/{timestamp}_{filnavn}
--      app/api/projects/upload/route.ts
--      app/api/projects/upload/download/route.ts
--
--   2. company-archive — bedriftsarkiv (ISO-sertifikater, maler, …)
--      Sti: {company_id}/{document_type_id}/{timestamp}_{filnavn}
--      app/api/archive/upload/route.ts
--      app/api/archive/download/route.ts
--      app/api/archive/preview/route.ts
--
-- MERK: API-rutene bruker service_role (admin) og omgår RLS. Policyene her er
-- forsvar i dybden ved direkte Storage-klient fra nettleser/SDK.

-- ============================================================
-- Hjelpefunksjoner — path → UUID (første mappeledd)
-- ============================================================
create or replace function public.storage_path_project_id(object_path text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when object_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
      then split_part(object_path, '/', 1)::uuid
    else null
  end;
$$;

create or replace function public.storage_path_company_id(object_path text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when object_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
      then split_part(object_path, '/', 1)::uuid
    else null
  end;
$$;

-- Kunde med aktiv tilgang til prosjekt (speiler snapshots_customer_read)
create or replace function public.customer_can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_project_access cpa
    where cpa.project_id = p_project_id
      and cpa.status = 'active'
      and cpa.customer_organization_id in (
        select cu.customer_organization_id
        from public.customer_users cu
        where cu.auth_user_id = auth.uid()
      )
  );
$$;

grant execute on function public.customer_can_access_project(uuid) to authenticated;

-- Leverandør/team-tilgang til bedriftsprofil (speiler resolveCompanyProfileId / company_archive RLS)
create or replace function public.supplier_can_access_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_profiles cp
    where cp.id = p_company_id
      and (
        cp.user_id = auth.uid()
        or exists (
          select 1
          from public.team_members tm
          where tm.user_id = auth.uid()
            and tm.status = 'active'
            and tm.company_id = cp.id
        )
        or exists (
          select 1
          from public.users u
          where u.id = auth.uid()
            and u.company_id = cp.id
        )
      )
  );
$$;

grant execute on function public.supplier_can_access_company(uuid) to authenticated;

-- ============================================================
-- Buckets — PRIVATE (public = false), maks 50 MB per fil
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, avif_autodetection)
values
  ('project-documents', 'project-documents', false, 52428800, false),
  ('company-archive', 'company-archive', false, 52428800, false)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit;

-- ============================================================
-- RLS: project-documents
-- Sti: {project_id}/…
-- ============================================================

-- Leverandør: les filer for egne/team-prosjekter
drop policy if exists "project_documents_supplier_select" on storage.objects;
create policy "project_documents_supplier_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.supplier_can_access_project(public.storage_path_project_id(name))
  );

-- Leverandør: last opp nye filer
drop policy if exists "project_documents_supplier_insert" on storage.objects;
create policy "project_documents_supplier_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.supplier_can_access_project(public.storage_path_project_id(name))
  );

-- Leverandør: oppdater metadata/innhold (sjeldent, men tillatt for samme prosjekt)
drop policy if exists "project_documents_supplier_update" on storage.objects;
create policy "project_documents_supplier_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.supplier_can_access_project(public.storage_path_project_id(name))
  )
  with check (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.supplier_can_access_project(public.storage_path_project_id(name))
  );

-- Leverandør: slett filer
drop policy if exists "project_documents_supplier_delete" on storage.objects;
create policy "project_documents_supplier_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.supplier_can_access_project(public.storage_path_project_id(name))
  );

-- Kunde: kun lesing for prosjekter med aktiv customer_project_access
drop policy if exists "project_documents_customer_select" on storage.objects;
create policy "project_documents_customer_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.storage_path_project_id(name) is not null
    and public.customer_can_access_project(public.storage_path_project_id(name))
  );

-- ============================================================
-- RLS: company-archive
-- Sti: {company_id}/…
-- ============================================================

-- Leverandør: full tilgang til egen bedrifts arkivfiler
drop policy if exists "company_archive_supplier_select" on storage.objects;
create policy "company_archive_supplier_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'company-archive'
    and public.storage_path_company_id(name) is not null
    and public.supplier_can_access_company(public.storage_path_company_id(name))
  );

drop policy if exists "company_archive_supplier_insert" on storage.objects;
create policy "company_archive_supplier_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-archive'
    and public.storage_path_company_id(name) is not null
    and public.supplier_can_access_company(public.storage_path_company_id(name))
  );

drop policy if exists "company_archive_supplier_update" on storage.objects;
create policy "company_archive_supplier_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-archive'
    and public.storage_path_company_id(name) is not null
    and public.supplier_can_access_company(public.storage_path_company_id(name))
  )
  with check (
    bucket_id = 'company-archive'
    and public.storage_path_company_id(name) is not null
    and public.supplier_can_access_company(public.storage_path_company_id(name))
  );

drop policy if exists "company_archive_supplier_delete" on storage.objects;
create policy "company_archive_supplier_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-archive'
    and public.storage_path_company_id(name) is not null
    and public.supplier_can_access_company(public.storage_path_company_id(name))
  );

-- Kunde: les arkivfil KUN når den er koblet til et prosjekt kunden har aktiv tilgang til
-- (via project_archive_links + company_archive.file_path)
drop policy if exists "company_archive_customer_select" on storage.objects;
create policy "company_archive_customer_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'company-archive'
    and exists (
      select 1
      from public.company_archive ca
      join public.project_archive_links pal on pal.archive_document_id = ca.id
      where ca.file_path = storage.objects.name
        and public.customer_can_access_project(pal.project_id)
    )
  );
