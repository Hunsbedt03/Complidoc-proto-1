-- Kravmal-system: kundekrav + leverandørkrav + systemforslag + checklist-view
-- Kjør manuelt i Supabase SQL Editor (MCP apply_migration er read-only).
--
-- Justeringer mot faktisk skjema (verifisert via MCP 2026-07-24):
-- 1. customer_project_access.project_id (ikke prosjekt_id)
-- 2. Kolonne document_id (ikke document_type) — samme nøkler som
--    document_revisions.document_id / project_attachments.linked_document_id /
--    lib/documents/ids.ts DocumentId (f.eks. risk_assessment, user_manual_en)
-- 3. project_id som FK-navn (konsistent med customer_project_access, attachments)
-- 4. Leverandørtilgang via eksisterende supplier_can_access_project(uuid)
-- 5. Kundetilgang via eksisterende customer_can_access_project(uuid)
-- 6. View security_invoker=false + auth-filter (ellers ser ikke kunde leverandørkrav
--    pga. tabell-RLS), samme mønster som command_center_projects
-- 7. status-check på suggestions: foreslatt | godkjent | avvist
-- 8. Unike (org/project, document_id)-par for å unngå duplikater

-- ============================================================
-- Tabeller
-- ============================================================

create table if not exists public.customer_requirement_templates (
  id uuid primary key default gen_random_uuid(),
  customer_organization_id uuid not null
    references public.customer_organizations(id) on delete cascade,
  document_id text not null,
  krav_beskrivelse text,
  aktiv boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_requirement_templates_document_id_nonempty
    check (length(trim(document_id)) > 0),
  constraint customer_requirement_templates_org_doc_unique
    unique (customer_organization_id, document_id)
);

comment on table public.customer_requirement_templates is
  'Kundens kravmaler per dokument-ID (DocumentId). Leverandør kan lese for delte org.';
comment on column public.customer_requirement_templates.document_id is
  'Samsiq DocumentId, f.eks. risk_assessment, user_manual_en, fmea.';

create index if not exists idx_customer_requirement_templates_org
  on public.customer_requirement_templates(customer_organization_id)
  where aktiv = true;

create table if not exists public.supplier_project_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.prosjekter(id) on delete cascade,
  document_id text not null,
  begrunnelse text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint supplier_project_requirements_document_id_nonempty
    check (length(trim(document_id)) > 0),
  constraint supplier_project_requirements_project_doc_unique
    unique (project_id, document_id)
);

comment on table public.supplier_project_requirements is
  'Leverandørens ekstra dokumentkrav på et konkret prosjekt.';

create index if not exists idx_supplier_project_requirements_project
  on public.supplier_project_requirements(project_id);

create table if not exists public.document_requirement_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.prosjekter(id) on delete cascade,
  document_id text not null,
  kilde_regel text,
  status text not null default 'foreslatt'
    check (status in ('foreslatt', 'godkjent', 'avvist')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint document_requirement_suggestions_document_id_nonempty
    check (length(trim(document_id)) > 0),
  constraint document_requirement_suggestions_project_doc_unique
    unique (project_id, document_id)
);

comment on table public.document_requirement_suggestions is
  'System-/regelbaserte dokumentforslag. Leverandør godkjenner/avviser.';

create index if not exists idx_document_requirement_suggestions_project_status
  on public.document_requirement_suggestions(project_id, status);

-- ============================================================
-- RLS-hjelpere (SECURITY DEFINER — unngå policy-rekursjon)
-- ============================================================

create or replace function public.customer_member_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cu.customer_organization_id
  from public.customer_users cu
  where cu.auth_user_id = auth.uid();
$$;

grant execute on function public.customer_member_org_ids() to authenticated;

comment on function public.customer_member_org_ids() is
  'customer_organization_id for innlogget kundebruker (auth.uid()).';

create or replace function public.supplier_can_read_customer_org_templates(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_project_access cpa
    where cpa.customer_organization_id = p_org_id
      and cpa.status = 'active'
      and public.supplier_can_access_project(cpa.project_id)
  );
$$;

grant execute on function public.supplier_can_read_customer_org_templates(uuid) to authenticated;

comment on function public.supplier_can_read_customer_org_templates(uuid) is
  'True hvis leverandør har minst ett aktivt delt prosjekt med kundeorganisasjonen.';

-- ============================================================
-- RLS: customer_requirement_templates
-- ============================================================

alter table public.customer_requirement_templates enable row level security;

drop policy if exists "crt_customer_select" on public.customer_requirement_templates;
create policy "crt_customer_select"
  on public.customer_requirement_templates for select
  to authenticated
  using (customer_organization_id in (select public.customer_member_org_ids()));

drop policy if exists "crt_customer_insert" on public.customer_requirement_templates;
create policy "crt_customer_insert"
  on public.customer_requirement_templates for insert
  to authenticated
  with check (
    customer_organization_id in (select public.customer_member_org_ids())
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "crt_customer_update" on public.customer_requirement_templates;
create policy "crt_customer_update"
  on public.customer_requirement_templates for update
  to authenticated
  using (customer_organization_id in (select public.customer_member_org_ids()))
  with check (customer_organization_id in (select public.customer_member_org_ids()));

drop policy if exists "crt_customer_delete" on public.customer_requirement_templates;
create policy "crt_customer_delete"
  on public.customer_requirement_templates for delete
  to authenticated
  using (customer_organization_id in (select public.customer_member_org_ids()));

-- Leverandør: kun lese krav for kunder de har aktive prosjekter hos
drop policy if exists "crt_supplier_select" on public.customer_requirement_templates;
create policy "crt_supplier_select"
  on public.customer_requirement_templates for select
  to authenticated
  using (
    aktiv = true
    and public.supplier_can_read_customer_org_templates(customer_organization_id)
  );

-- ============================================================
-- RLS: supplier_project_requirements
-- ============================================================

alter table public.supplier_project_requirements enable row level security;

drop policy if exists "spr_supplier_all" on public.supplier_project_requirements;
create policy "spr_supplier_all"
  on public.supplier_project_requirements for all
  to authenticated
  using (public.supplier_can_access_project(project_id))
  with check (
    public.supplier_can_access_project(project_id)
    and (created_by is null or created_by = auth.uid())
  );

-- ============================================================
-- RLS: document_requirement_suggestions
-- ============================================================

alter table public.document_requirement_suggestions enable row level security;

-- Leverandør leser alle forslag på egne prosjekter
drop policy if exists "drs_supplier_select" on public.document_requirement_suggestions;
create policy "drs_supplier_select"
  on public.document_requirement_suggestions for select
  to authenticated
  using (public.supplier_can_access_project(project_id));

-- Leverandør kan opprette forslag manuelt (system/AI bruker typisk service_role)
drop policy if exists "drs_supplier_insert" on public.document_requirement_suggestions;
create policy "drs_supplier_insert"
  on public.document_requirement_suggestions for insert
  to authenticated
  with check (public.supplier_can_access_project(project_id));

-- Leverandør oppdaterer status (godkjenn/avvis) + reviewed_*
drop policy if exists "drs_supplier_update" on public.document_requirement_suggestions;
create policy "drs_supplier_update"
  on public.document_requirement_suggestions for update
  to authenticated
  using (public.supplier_can_access_project(project_id))
  with check (public.supplier_can_access_project(project_id));

-- Ingen delete-policy for authenticated (kun service_role / eier via admin)

-- ============================================================
-- View: samlet sjekkliste per prosjekt
-- ============================================================

create or replace view public.project_document_checklist
with (security_invoker = false)
as
select
  p.id as project_id,
  'kunde'::text as kilde,
  crt.document_id,
  crt.krav_beskrivelse as detaljer
from public.prosjekter p
join public.customer_project_access cpa
  on cpa.project_id = p.id
 and cpa.status = 'active'
 and cpa.customer_organization_id is not null
join public.customer_requirement_templates crt
  on crt.customer_organization_id = cpa.customer_organization_id
 and crt.aktiv = true
where
  public.supplier_can_access_project(p.id)
  or public.customer_can_access_project(p.id)

union all

select
  p.id as project_id,
  'leverandor'::text as kilde,
  spr.document_id,
  spr.begrunnelse as detaljer
from public.prosjekter p
join public.supplier_project_requirements spr
  on spr.project_id = p.id
where
  public.supplier_can_access_project(p.id)
  or public.customer_can_access_project(p.id)

union all

select
  p.id as project_id,
  'forslag'::text as kilde,
  drs.document_id,
  drs.kilde_regel as detaljer
from public.prosjekter p
join public.document_requirement_suggestions drs
  on drs.project_id = p.id
 and drs.status = 'godkjent'
where
  public.supplier_can_access_project(p.id)
  or public.customer_can_access_project(p.id);

comment on view public.project_document_checklist is
  'Samlet dokumentkrav per prosjekt: aktiv kundemal + leverandørkrav + godkjente forslag. Filtrert på auth.uid() via supplier/customer helpers.';

grant select on public.project_document_checklist to authenticated;

grant select, insert, update, delete on public.customer_requirement_templates to authenticated;
grant select, insert, update, delete on public.supplier_project_requirements to authenticated;
grant select, insert, update on public.document_requirement_suggestions to authenticated;
