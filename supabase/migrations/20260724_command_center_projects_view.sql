-- Command Center Fase 3: view + helper for kundeoversikt på tvers av leverandører
-- Ingen ny SELECT-policy på company_profiles (kun trygge felt via viewet).

create or replace function public.customer_accessible_supplier_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.company_profile_id
  from public.customer_users cu
  join public.customer_project_access cpa
    on cpa.customer_organization_id = cu.customer_organization_id
   and cpa.status = 'active'
  join public.prosjekter p
    on p.id = cpa.project_id
  where cu.auth_user_id = auth.uid();
$$;

grant execute on function public.customer_accessible_supplier_ids() to authenticated;

create or replace view public.command_center_projects
with (security_invoker = false)
as
select
  p.id as project_id,
  p.navn as project_name,
  coalesce(p.workflow_status, p.status) as project_status,
  p.updated_at as project_updated_at,
  p.created_at as project_created_at,
  cp.id as supplier_id,
  cp.company_name as supplier_name,
  cp.logo_url as supplier_logo_url,
  cp.website as supplier_website,
  cp.city as supplier_city,
  cp.country as supplier_country
from public.customer_users cu
join public.customer_project_access cpa
  on cpa.customer_organization_id = cu.customer_organization_id
 and cpa.status = 'active'
join public.prosjekter p
  on p.id = cpa.project_id
join public.company_profiles cp
  on cp.id = p.company_profile_id
where cu.auth_user_id = auth.uid();

grant select on public.command_center_projects to authenticated;

comment on view public.command_center_projects is
  'Command Center: kundens prosjekter på tvers av leverandører. Kun trygge leverandørfelt.';

comment on function public.customer_accessible_supplier_ids() is
  'Leverandør-IDer (company_profiles.id) som innlogget kunde har aktive prosjekt-tilganger hos.';
