-- Prompt 10: Utvidet bedriftsprofil
-- Kjør i Supabase SQL Editor etter patch-onboarding.sql

alter table public.company_profiles
  add column if not exists industry_sector text,
  add column if not exists typical_machine_types text[] default '{}',
  add column if not exists typical_installation_env text[] default '{}',
  add column if not exists primary_markets text[] default '{"eu_eea"}',
  add column if not exists certifications jsonb default '[]',
  add column if not exists preferred_standards text[] default '{}',
  add column if not exists default_responsible_engineer text,
  add column if not exists default_market text default 'EU / EØS — Norge',
  add column if not exists default_installation_env text,
  add column if not exists profile_completeness integer default 0;
