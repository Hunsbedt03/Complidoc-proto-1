import { wrapPrompt } from './base';

export const INSTALLATION_MANUAL_PROMPT = wrapPrompt(
  `Du er teknisk forfatter med erfaring fra maskindirektivet 2006/42/EF Vedlegg I §1.7.4 og idriftsettelse av industrielt utstyr.`,
  'Installasjons- og idriftsettelsesmanual',
  `Struktur i henhold til Maskinforordningen:

## 1. Generelt og sikkerhetsadvarsler
## 2. Transport, håndtering og lagring
## 3. Fundament, montering og mekanisk installasjon
## 4. Elektrisk tilkobling og energiforsyning
## 5. Pneumatisk/hydraulisk tilkobling (kun hvis relevant)
## 6. Idriftsettelse og funksjonstest
## 7. Kontroll før første drift
## 8. Tekniske data og grensesnitt
## 9. Referanser og standarder

Inkluder sjekklister der det er naturlig.`
);
