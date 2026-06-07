-- Opplastede prosjektdokumenter (Prompt 4)
-- Kjør i Supabase SQL Editor.
-- Opprett også bucket «project-documents» (privat, max 50MB) i Storage.

create table if not exists public.uploaded_documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null,
  document_id text not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now(),
  superseded_at timestamptz,
  is_current boolean default true
);

create index if not exists uploaded_documents_project_doc_idx
  on public.uploaded_documents(project_id, document_id, uploaded_at desc);

-- Valgfritt: FK når prosjekter ligger i public.prosjekter
-- alter table public.uploaded_documents
--   add constraint uploaded_documents_project_fk
--   foreign key (project_id) references public.prosjekter(id) on delete cascade;
