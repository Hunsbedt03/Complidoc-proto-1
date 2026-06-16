-- Opplastede prosjektdokumenter (Prompt 4 + Prompt 18 RLS)
-- Kjør i Supabase SQL Editor.
--
-- FORUTSETNINGER (må finnes fra før):
--   - public.prosjekter
--   - public.supplier_can_access_project(uuid)  (20260616_customer_portal_schema.sql)
--
-- I tillegg: opprett Storage-bucket «project-documents» (privat, max ~50MB) i Dashboard.

-- ============================================================
-- 1. Tabell
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

-- ============================================================
-- 2. RLS (krever supplier_can_access_project)
-- ============================================================
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
