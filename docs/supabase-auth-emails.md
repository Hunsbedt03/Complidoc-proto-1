# Supabase Auth — e-postmaler og redirect-URLer

Konfigureres manuelt i **Supabase Dashboard → Authentication**.

## URL Configuration

Under **Authentication → URL Configuration**:

| Felt | Verdi |
|------|--------|
| Site URL | `https://samsiq.no` |
| Redirect URLs | `https://samsiq.no/**` |
| Redirect URLs (lokal utvikling) | `http://localhost:3000/**` |

Appen bruker `/auth/callback?next=...` for PKCE code exchange. Eksempler:

- Glemt passord: `https://samsiq.no/auth/callback?next=/reset-password`
- Bekreft registrering: `https://samsiq.no/auth/callback?next=/login`

## Reset Password (Tilbakestill passord)

**Emne:** Tilbakestill passordet ditt — Samsiq

**Brødtekst (HTML):**

```html
<h2>Tilbakestill passord</h2>
<p>Du har bedt om å tilbakestille passordet ditt på Samsiq.</p>
<p><a href="{{ .ConfirmationURL }}">Klikk her for å sette et nytt passord</a></p>
<p>Lenken er gyldig i en begrenset periode. Hvis du ikke ba om dette, kan du se bort fra e-posten.</p>
<p>— Samsiq</p>
```

`{{ .ConfirmationURL }}` peker til Supabase verify-endepunkt, som deretter redirecter til appens callback og `/reset-password`.

## Change Email Address (Endre e-post)

**Emne:** Bekreft ny e-postadresse — Samsiq

**Brødtekst (HTML):**

```html
<h2>Bekreft e-postendring</h2>
<p>Du har bedt om å endre e-postadressen knyttet til Samsiq-kontoen din.</p>
<p><a href="{{ .ConfirmationURL }}">Bekreft ny e-postadresse</a></p>
<p>E-postadressen endres ikke før du bekrefter via lenken.</p>
<p>— Samsiq</p>
```

Supabase sender også varsel til gammel e-post (standard sikkerhetsoppsett).

## Confirm signup (Bekreft registrering)

**Emne:** Bekreft kontoen din — Samsiq

**Brødtekst (HTML):**

```html
<h2>Velkommen til Samsiq</h2>
<p>Takk for at du opprettet konto. Bekreft e-postadressen din for å komme i gang.</p>
<p><a href="{{ .ConfirmationURL }}">Bekreft e-post og logg inn</a></p>
<p>— Samsiq</p>
```

Ved registrering i appen settes `emailRedirectTo` til `/auth/callback?next=/login`.

## Verifisering

1. **Glemt passord:** `/login` → «Glemt passord?» → sjekk at e-postlenke går via `samsiq.no` (ikke `localhost` i produksjon).
2. **Registrering:** Ny bruker → bekreftelses-e-post → redirect til innlogging.
3. **Endre e-post:** Kontoinnstillinger → ny e-post → bekreftelses-e-post mottas.

## Avsender

Supabase Auth-e-post bruker Supabase sin standard avsender med mindre du konfigurerer custom SMTP (Authentication → SMTP Settings). For produksjon anbefales egen SMTP med domene `@hultech.no` eller tilsvarende.
