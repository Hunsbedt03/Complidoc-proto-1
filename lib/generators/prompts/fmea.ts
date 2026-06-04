import { wrapPrompt } from './base';

export const FMEA_PROMPT = wrapPrompt(
  `Du er senior reliability engineer med erfaring fra maskinsikkerhet og EN ISO 12100.`,
  'FMEA (Failure Mode and Effects Analysis)',
  `Struktur:

## 1. Omfang og komponentliste
## 2. FMEA-tabell
For hver komponent/funksjon: Komponent | Feilmodus | Årsak | Effekt | S | O | D | RPN | Anbefalte tiltak
## 3. Prioriterte tiltak
## 4. Referanser og standarder`
);
