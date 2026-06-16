# Storage bucket policies — manuell verifikasjon

Vi har **ikke** programmatisk tilgang til Supabase Dashboard policies fra kodebasen. Nicolas må verifisere følgende manuelt under **Supabase Dashboard → Storage → Policies**.

## Buckets

| Bucket | Formål |
|--------|--------|
| `project-documents` | Opplastede prosjektfiler (PDF m.m.) |
| `company-archive` | Bedriftsarkiv / sertifikater |

## Sjekkliste per bucket

For hver bucket, bekreft at policies finnes og at de matcher intensjonen:

### `project-documents`

- [ ] **SELECT**: Kun brukere med tilgang til prosjektet (`supplier_can_access_project` eller tilsvarende path-basert sjekk)
- [ ] **INSERT**: Kun autentiserte leverandører med prosjekttilgang
- [ ] **UPDATE/DELETE**: Kun eier/team med skrivetilgang til prosjektet
- [ ] Ingen **public** read/write uten auth

### `company-archive`

- [ ] **SELECT**: Kun medlemmer av bedriften (`company_profiles` / `team_members`)
- [ ] **INSERT/UPDATE/DELETE**: Kun admin/eier av bedriften
- [ ] Ingen **public** read/write

## Hvordan teste

1. Logg inn som leverandør A — last opp fil til prosjekt → skal fungere
2. Logg inn som leverandør B (annen bedrift) — forsøk direkte URL til A sin fil → skal feile (403)
3. Logg inn som teammedlem i A sin bedrift → skal se A sine prosjekter og filer
4. Uautentisert request til storage URL → skal feile

## Merknad om `uploaded_documents`

Tabell-RLS for metadata ligger i `supabase/migrations/20260618_security_revisions_snapshots.sql`. Storage policies må fortsatt samsvare slik at filene i bucket ikke er mer åpne enn metadata-radene.

## Legacy-nøkler

Hvis `js/samsiq-supabase.js` (slettet) inneholdt anon key: vurder **rotering** av anon key i Supabase hvis den har vært eksponert lenge i git-historikk.
