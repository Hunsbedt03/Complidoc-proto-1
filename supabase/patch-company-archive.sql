-- Prompt 9: Bedriftsarkiv og prosjekt-koblinger
-- Kjør i Supabase SQL Editor etter patch-onboarding.sql
-- Opprett privat Storage-bucket: company-archive (Dashboard → Storage → New bucket, ikke public)

create table if not exists public.company_archive (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  document_type_id text not null,
  label text not null,
  category text not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  version text default 'v1',
  valid_from date,
  valid_until date,
  iso_certifications text[] default '{}',
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz default now(),
  last_reviewed_at timestamptz,
  review_interval_months integer,
  tags text[] default '{}',
  notes text,
  is_active boolean default true,
  superseded_by uuid references public.company_archive(id)
);

create table if not exists public.project_archive_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  archive_document_id uuid not null references public.company_archive(id) on delete cascade,
  document_type_id text not null,
  linked_at timestamptz default now(),
  linked_by uuid references public.users(id),
  link_status text default 'auto_linked'
    check (link_status in ('auto_linked', 'confirmed', 'rejected'))
);

create index if not exists company_archive_lookup_idx
  on public.company_archive(company_id, document_type_id, is_active);

create index if not exists project_archive_links_lookup_idx
  on public.project_archive_links(project_id, document_type_id);

alter table public.company_archive enable row level security;
alter table public.project_archive_links enable row level security;

create policy "company_archive_own" on public.company_archive
  for all using (
    company_id in (
      select id from public.company_profiles where user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select id from public.company_profiles where user_id = auth.uid()
    )
  );

create policy "project_archive_links_own" on public.project_archive_links
  for all using (
    project_id in (
      select id from public.prosjekter where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.prosjekter where user_id = auth.uid()
    )
  );

-- Oppdater koblinger på ikke-låste prosjekter ved ny arkivversjon
create or replace function public.update_archive_links(
  old_archive_id uuid,
  new_archive_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_archive_links pal
  set archive_document_id = new_archive_id,
      linked_at = now()
  from public.prosjekter p
  where pal.project_id = p.id
    and pal.archive_document_id = old_archive_id
    and coalesce(p.workflow_status, 'draft') <> 'locked';
end;
$$;
