import { wrapPrompt } from './base';

export const USER_MANUAL_PROMPT_NO = wrapPrompt(
  `Du er teknisk forfatter for maskindokumentasjon iht. Maskindirektivet Vedlegg I §1.7.4.`,
  'Brukerhåndbok (norsk)',
  `Struktur:

## 1. Innledning og produktidentifikasjon
## 2. Sikkerhetsinstruksjoner
## 3. Installasjon og idriftsettelse
## 4. Betjening
## 5. Vedlikehold
## 6. Feilsøking
## 7. Avhending og miljø`
);
