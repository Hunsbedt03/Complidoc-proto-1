-- Prompt 23 follow-up: direkte kobling prosjekter → company_profiles
-- Kjør manuelt i Supabase SQL Editor (allerede kjørt i prod).

alter table public.prosjekter
  add column if not exists company_profile_id uuid
    references public.company_profiles(id);

create index if not exists idx_prosjekter_company_profile
  on public.prosjekter(company_profile_id);

update public.prosjekter p
set company_profile_id = cp.id
from public.company_profiles cp
where cp.user_id = p.user_id
  and p.company_profile_id is null;

-- Verifiser at denne returnerer 0 før NOT NULL:
-- select count(*) from public.prosjekter where company_profile_id is null;

alter table public.prosjekter
  alter column company_profile_id set not null;
