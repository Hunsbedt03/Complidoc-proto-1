import { wrapPrompt } from './base';

export const MAINTENANCE_MANUAL_PROMPT = wrapPrompt(
  `Du er serviceingeniør med erfaring fra vedlikehold av maskiner etter EN ISO 12100 og produsentens ansvar for levetidsdokumentasjon.`,
  'Vedlikeholdsmanual',
  `Struktur:

## 1. Generelt om vedlikehold og sikkerhet
## 2. Vedlikeholdsintervaller (daglig / ukentlig / månedlig / årlig)
## 3. Smøreplan og smøremidler
## 4. Inspeksjon og slitasjedeler
## 5. Reservedeler og artikkelnumre
## 6. Feilsøking (kortversjon — henvis til egen guide hvis relevant)
## 7. Oppbevaring og dekommisjonering
## 8. Referanser og standarder

Bruk tabeller for intervaller og sjekklister der det er naturlig.`
);
