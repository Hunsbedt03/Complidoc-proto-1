-- Prompt 12: Dokumentrevisjoner (tilpasset Samsiq-skjema: prosjekter + tekst document_id)
-- Kjør i Supabase SQL Editor eller via: npx supabase db push

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
  unique (project_id, document_id, revision)
);

create index if not exists idx_document_revisions_document_id
  on public.document_revisions(document_id);

create index if not exists idx_document_revisions_project_id
  on public.document_revisions(project_id);

create index if not exists document_revisions_project_doc_idx
  on public.document_revisions(project_id, document_id, revision desc);

alter table public.prosjekter
  add column if not exists workflow_status text default 'draft'
    check (workflow_status in ('draft', 'review', 'locked'));

alter table public.document_revisions enable row level security;

drop policy if exists "document_revisions_select_own_projects" on public.document_revisions;
create policy "document_revisions_select_own_projects"
  on public.document_revisions for select
  using (
    project_id in (
      select id from public.prosjekter where user_id = auth.uid()
    )
  );

drop policy if exists "document_revisions_insert_own_projects" on public.document_revisions;
create policy "document_revisions_insert_own_projects"
  on public.document_revisions for insert
  with check (
    project_id in (
      select id from public.prosjekter where user_id = auth.uid()
    )
  );
