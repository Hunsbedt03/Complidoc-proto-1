-- Revisjonshistorikk for dokumenter (Prompt 3 tillegg)
create table if not exists public.document_revisions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.prosjekter(id) on delete cascade,
  document_id text not null,
  revision integer not null,
  content text not null default '',
  content_json jsonb,
  change_type text not null,
  change_note text not null,
  changed_by uuid references auth.users(id),
  changed_by_name text not null,
  changed_at timestamptz default now(),
  source text not null,
  unique(project_id, document_id, revision)
);

create index if not exists document_revisions_project_doc_idx
  on public.document_revisions(project_id, document_id, revision desc);

alter table public.prosjekter
  add column if not exists workflow_status text default 'draft'
    check (workflow_status in ('draft', 'review', 'locked'));
