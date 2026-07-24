-- S3 Fase B: fjern legacy bedrifter / brukere_bedrifter (+ bedrift_id-kolonner)
-- Kjør manuelt i Supabase SQL Editor etter Fase A er live og verifisert.
-- IKKE dropp public.maskiner — kun FK/kolonne bedrift_id der.
--
-- Forventet før kjøring (MCP-verifisert 2026-07-24):
--   prosjekter: 7 rader, alle med company_profile_id, bedrift_id IS NULL
--   bedrifter / brukere_bedrifter / maskiner: 0 rader
--
-- Policies på begge tabeller (MCP pg_policies 2026-07-24):
--   bedrifter: bedrifter_insert_auth, bedrifter_select_member, bedrifter_update_admin
--   brukere_bedrifter: bb_insert_own, bb_select_own
-- (bedrifter_select_member / bedrifter_update_admin refererer brukere_bedrifter —
--  derfor må policies droppes eksplisitt før DROP TABLE)

begin;

-- 1) maskiner: fjern FK + ubrukt kolonne (behold tabellen)
alter table public.maskiner
  drop constraint if exists maskiner_bedrift_id_fkey;

alter table public.maskiner
  drop column if exists bedrift_id;

-- 2) prosjekter: fjern FK + kolonne bedrift_id
alter table public.prosjekter
  drop constraint if exists prosjekter_bedrift_id_fkey;

alter table public.prosjekter
  drop column if exists bedrift_id;

-- 3) Drop RLS-policies eksplisitt (ikke CASCADE) før tabellene
drop policy if exists "bedrifter_select_member" on public.bedrifter;
drop policy if exists "bedrifter_insert_auth" on public.bedrifter;
drop policy if exists "bedrifter_update_admin" on public.bedrifter;

drop policy if exists "bb_select_own" on public.brukere_bedrifter;
drop policy if exists "bb_insert_own" on public.brukere_bedrifter;

-- 4) Drop membership-tabell først (FK → bedrifter), deretter bedrifter
drop table if exists public.brukere_bedrifter;

drop table if exists public.bedrifter;

commit;

-- ─── Etterkontroll (kjør separat etter commit) ─────────────────────────────
-- select to_regclass('public.bedrifter') as bedrifter,
--        to_regclass('public.brukere_bedrifter') as brukere_bedrifter;
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='prosjekter' and column_name='bedrift_id';
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='maskiner' and column_name='bedrift_id';
-- select count(*) as total,
--        count(*) filter (where company_profile_id is not null) as with_cp
-- from public.prosjekter;
-- select to_regclass('public.maskiner') as maskiner_still_exists;
