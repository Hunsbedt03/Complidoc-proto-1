import { MANGLER_REGEL, NEUTRALITET } from './base';
import type { StructuredTableDocumentId } from '@/lib/document-model/types';

const JSON_RULE = `
SVARFORMAT:
Returner KUN én JSON-blokk i markdown code fence (\`\`\`json ... \`\`\`).
Ingen annen tekst utenfor JSON-blokken.
Numeriske felt (S, O, D, RPN, MTTFd, DC) skal være tall ELLER strengen "MANGLER".
Tekstfelt uten data skal være "MANGLER" eller "[MANGLER: beskrivelse]".`;

const PROMPTS: Record<StructuredTableDocumentId, { role: string; schema: string }> = {
  fmea: {
    role: 'Du er senior reliability engineer med erfaring fra maskinsikkerhet og EN ISO 12100.',
    schema: `JSON-skjema:
{
  "rows": [
    {
      "komponent": "string",
      "feilmodus": "string",
      "effekt": "string",
      "alvorlighet": "number | MANGLER",
      "sannsynlighet": "number | MANGLER",
      "detekterbarhet": "number | MANGLER",
      "rpn": "number | MANGLER",
      "tiltak": "string",
      "notat": "string (valgfritt)"
    }
  ]
}
Generer minst 5 rader basert på maskindata. RPN = S × O × D når alle tre er tall.`,
  },
  hazard_register: {
    role: 'Du er maskinsikkerhetsekspert. Prefill farer fra risikovurderingskontekst der tilgjengelig.',
    schema: `JSON-skjema:
{
  "rows": [
    {
      "fareId": "H-001",
      "faretype": "string",
      "livssyklusfase": "string",
      "eksponertePersoner": "string",
      "risikoForeTiltak": "string",
      "tiltak": "string",
      "residualrisiko": "string"
    }
  ]
}
Generer minst 5 farer. Bruk fare-IDer H-001, H-002, osv.`,
  },
  safety_function_analysis: {
    role: 'Du er funksjonssikkerhetsekspert (EN ISO 13849 / IEC 62061).',
    schema: `JSON-skjema:
{
  "rows": [
    {
      "funksjon": "string",
      "kategori": "B | 1 | 2 | 3 | 4 | MANGLER",
      "arkitektur": "string",
      "mttfd": "string | MANGLER",
      "dc": "string | MANGLER",
      "ccfTiltak": "string",
      "resultatPlEllerSil": "string | MANGLER"
    }
  ]
}
Generer minst 3 sikkerhetsfunksjoner. Ikke konkluder PL/SIL uten tilstrekkelig data — bruk MANGLER.`,
  },
};

export function buildStructuredPrompt(
  id: StructuredTableDocumentId,
  context: string
): string {
  const spec = PROMPTS[id];
  return `${spec.role}

${MANGLER_REGEL}
${NEUTRALITET}
${JSON_RULE}

${context}

Generer strukturert JSON for: **${id.replace(/_/g, ' ')}**

${spec.schema}`;
}
