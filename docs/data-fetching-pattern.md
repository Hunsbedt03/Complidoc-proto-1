# Datahenting i Samsiq

Dette dokumentet beskriver **målstrategien** for datahenting fremover. Eksisterende kode refaktoreres ikke fullt ut i én omgang.

## Regler

### Bruk API-ruter (`/app/api/*`) for

- All **skriving** (POST/PATCH/DELETE) som påvirker flere tabeller eller krever forretningslogikk
- **Sensitiv lesing** der RLS alene ikke er tilstrekkelig (kundeportal, invitasjoner, signering, abonnement)
- Operasjoner som krever **service role** (admin-klient)
- Idempotente operasjoner med varsler, e-post eller kvoter

Server-ruter skal bruke `requireAdminClient()` når de trenger service role — ikke `admin ?? supabase`.

### Direkte Supabase-klient (browser/server) er OK for

- **Enkel lesing** av egne data der RLS er korrekt konfigurert (`prosjekter`, `dokumenter`, `document_revisions` med `supplier_can_access_project`)
- Dashboard-lister som kun viser data brukeren allerede har tilgang til via RLS
- Profil/oppslag på `users` for innlogget bruker

### Kundeportal

- Kundevisning går via dedikerte API-ruter og admin-klient på server
- Dokumentinnhold for signerte/låste sykluser hentes fra **snapshots** (`revision_cycle_document_snapshots`), ikke live innhold

## Feilhåndtering

- API-ruter: `formatSupabaseError` i JSON-svar
- Klient: `form-error` / inline state — unngå `alert()` og stille `.catch(() => {})`
- Skill **tom liste** (ingen data) fra **feil** (HTTP 4xx/5xx eller `projectsError`)

## Nye features

1. Vurder om operasjonen er sensitiv → API-first
2. Legg RLS-policy hvis data leses direkte fra klient
3. Bruk batch-spørringer fremfor N+1 i loops
4. Dokumenter avvik fra dette mønsteret i PR-beskrivelsen
