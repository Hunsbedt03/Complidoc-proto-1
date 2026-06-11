# Stripe live-modus — Samsiq

## Forutsetninger (Stripe Dashboard)

1. Fullfør kontoaktivering (org.nr, bankkonto, adresse).
2. Opprett **4 live-priser** (Products → Add product → Recurring):
   - Starter månedlig: **990 NOK** / måned
   - Starter årlig: **8900 NOK** / år
   - Pro månedlig: **2490 NOK** / måned
   - Pro årlig: **21900 NOK** / år
3. Hent live API-nøkler: Developers → API keys (`sk_live_…`, `pk_live_…`).
4. Opprett **live webhook**:
   - URL: `https://complidoc-proto-1.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Noter `whsec_…` (live webhook secret — ikke test-secret).
5. Aktiver **Customer portal**: Settings → Billing → Customer portal (endre plan, kansellere, fakturaer).

## Miljøvariabler

Oppdater i **Vercel** (complidoc-proto-1 → Settings → Environment Variables) og **`.env.local`**:

```env
NEXT_PUBLIC_APP_URL=https://complidoc-proto-1.vercel.app

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...          # fra live webhook

STRIPE_STARTER_MONTHLY_PRICE_ID=price_... # live, ikke test
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

**Ikke bruk** disse test Price IDs i live:

- `price_1Tfems23yykNRNv25PJtPSV4` (Starter månedlig)
- `price_1TfeqW23yykNRNv2HGryOGLq` (Starter årlig)
- `price_1Tfewo23yykNRNv2N4nkVBkY` (Pro månedlig)
- `price_1Tfexa23yykNRNv2O2tJKfW2` (Pro årlig)

Etter endring på Vercel: **Redeploy** (miljøvariabler lastes ikke på eksisterende deploy uten ny build).

## Verifiser oppsett

```bash
curl https://complidoc-proto-1.vercel.app/api/stripe/health
```

Forventet når live er riktig konfigurert:

- `liveReady: true`
- `mode.secret` og `mode.publishable`: `"live"`
- `issues: []`

## Test live-betaling

1. Deploy med live-variabler.
2. Registrer ny bruker på produksjons-URL.
3. Gå til `/priser` → velg plan → fullfør checkout med ekte kort.
4. Dashboard skal vise aktiv plan etter redirect (`?payment=success`).
5. Stripe Dashboard → Payments skal vise betalingen.
6. Webhook-logg i Stripe skal vise `checkout.session.completed` med status 200.

## Feilsøking

| Symptom | Løsning |
|--------|---------|
| Webhook 400/500 | `STRIPE_WEBHOOK_SECRET` må være fra **live** webhook |
| «No such price» | Test Price IDs i env — bytt til live IDs |
| Checkout åpner ikke | Sjekk `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + redeploy |
| `mode_mismatch` i `/api/stripe/health` | Både secret og publishable må være live |
| Abonnement aktiveres ikke | Sjekk `SUPABASE_SERVICE_ROLE_KEY` (webhook skriver via admin) |

## Kode (allerede implementert)

- `app/api/stripe/webhook/route.ts` — alle 4 events
- `app/api/stripe/portal/route.ts` — return_url → `/app/dashboard`
- `components/SubscriptionBanner.tsx` — banner ved `past_due`
- `lib/plans.ts` — priser fra env
