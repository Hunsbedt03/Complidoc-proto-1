-- Prompt 22 Del A: Fri filopplasting / vedleggsseksjon (leverandør ↔ kunde)
-- Kjør manuelt i Supabase SQL Editor (ikke auto-kjørt).
--
-- FORUTSETNINGER:
--   - public.prosjekter
--   - public.supplier_can_access_project(uuid)   (20260616)
--   - public.customer_can_access_project(uuid)   (20260621_storage_buckets_rls.sql)
--   - Storage-bucket «project-documents» (privat, 20260621)
--
-- FYSISKE FILER:
--   Bucket: project-documents
--   Sti:    {project_id}/attachments/{timestamp}_{filnavn}
--   Storage-RLS fra prompt 21 bruker storage_path_project_id(name) som leser
--   FØRSTE mappeledd (= project_id). Ekstra «attachments/»-ledd påvirker ikke
--   tilgang — verifisert: split_part('uuid/attachments/123_file.pdf', '/', 1) = uuid.
--
-- MERK om linked_document_id:
--   Compliance-dokumenter i Samsiq identifiseres med tekst-ID-er (f.eks.
--   risk_assessment, fmea) — samme som document_revisions.document_id og
--   uploaded_documents.document_id. Kolonnen er derfor text, ikke uuid.

-- ============================================================
-- Tabell
-- ============================================================
create table if not exists public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  description text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid not null references auth.users(id),
  uploader_role text not null check (uploader_role in ('supplier', 'customer')),
  visible_to_customer boolean not null default false,
  linked_document_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_attachments_project
  on public.project_attachments(project_id);

create index if not exists idx_project_attachments_project_created
  on public.project_attachments(project_id, created_at desc);

create index if not exists idx_project_attachments_linked_doc
  on public.project_attachments(project_id, linked_document_id)
  where linked_document_id is not null;

comment on table public.project_attachments is
  'Frivillige prosjektvedlegg (leverandør ↔ kunde). Filer i project-documents/{project_id}/attachments/…';

comment on column public.project_attachments.visible_to_customer is
  'Kun relevant for uploader_role=supplier. Kundens egne vedlegg er alltid synlige for leverandør.';

comment on column public.project_attachments.linked_document_id is
  'Valgfri kobling til compliance-dokument (katalog-ID, f.eks. risk_assessment).';

-- ============================================================
-- RLS
-- ============================================================
alter table public.project_attachments enable row level security;

-- Leverandør: full tilgang til alle vedlegg på egne/team-prosjekter
drop policy if exists "project_attachments_supplier_all" on public.project_attachments;
create policy "project_attachments_supplier_all"
  on public.project_attachments for all
  to authenticated
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

-- Kunde: les vedlegg leverandør har delt + egne opplastede
drop policy if exists "project_attachments_customer_select" on public.project_attachments;
create policy "project_attachments_customer_select"
  on public.project_attachments for select
  to authenticated
  using (
    public.customer_can_access_project(project_id)
    and (
      visible_to_customer = true
      or uploaded_by = auth.uid()
    )
  );

-- Kunde: last opp egne vedlegg (merkes alltid som customer, uten synlighetsstyring)
drop policy if exists "project_attachments_customer_insert" on public.project_attachments;
create policy "project_attachments_customer_insert"
  on public.project_attachments for insert
  to authenticated
  with check (
    public.customer_can_access_project(project_id)
    and uploaded_by = auth.uid()
    and uploader_role = 'customer'
    and visible_to_customer = false
  );

-- Kunde: oppdater kun egne vedlegg; kan ikke eskalere rolle eller synlighet
drop policy if exists "project_attachments_customer_update" on public.project_attachments;
create policy "project_attachments_customer_update"
  on public.project_attachments for update
  to authenticated
  using (
    public.customer_can_access_project(project_id)
    and uploaded_by = auth.uid()
    and uploader_role = 'customer'
  )
  with check (
    public.customer_can_access_project(project_id)
    and uploaded_by = auth.uid()
    and uploader_role = 'customer'
    and visible_to_customer = false
  );

-- Kunde: slett kun egne vedlegg
drop policy if exists "project_attachments_customer_delete" on public.project_attachments;
create policy "project_attachments_customer_delete"
  on public.project_attachments for delete
  to authenticated
  using (
    public.customer_can_access_project(project_id)
    and uploaded_by = auth.uid()
    and uploader_role = 'customer'
  );
