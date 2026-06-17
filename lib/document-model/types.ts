/** Inline tekst inni avsnitt (f.eks. fet fra Markdown). */
export type InlineSpan = { text: string; bold?: boolean; italic?: boolean };

/** Format-uavhengig innholdsmodell for DOCX/PDF-eksport. */
export type DocumentBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string; spans?: InlineSpan[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

/** Plain text fra paragraph-blokk (inkl. spans). */
export function paragraphPlainText(block: Extract<DocumentBlock, { type: 'paragraph' }>): string {
  if (block.spans?.length) return block.spans.map((s) => s.text).join('');
  return block.text;
}

export type ManglerValue = number | string;

export type FmeaRow = {
  komponent: string;
  feilmodus: string;
  effekt: string;
  alvorlighet: ManglerValue;
  sannsynlighet: ManglerValue;
  detekterbarhet: ManglerValue;
  rpn: ManglerValue;
  tiltak: string;
  notat?: string;
};

export type FareregisterRow = {
  fareId: string;
  faretype: string;
  livssyklusfase: string;
  eksponertePersoner: string;
  risikoForeTiltak: string;
  tiltak: string;
  residualrisiko: string;
};

export type SikkerhetsfunksjonRow = {
  funksjon: string;
  kategori: 'B' | '1' | '2' | '3' | '4' | 'MANGLER';
  arkitektur: string;
  mttfd: string | 'MANGLER';
  dc: string | 'MANGLER';
  ccfTiltak: string;
  resultatPlEllerSil: string | 'MANGLER';
};

export type StructuredDocumentData =
  | { kind: 'fmea'; rows: FmeaRow[] }
  | { kind: 'hazard_register'; rows: FareregisterRow[] }
  | { kind: 'safety_function_analysis'; rows: SikkerhetsfunksjonRow[] };

export type DocumentLanguage = 'no' | 'en';

/** Serialiserer celleverdi for tabell/blokk (inkl. MANGLER). */
export function formatCellValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return String(value);
  return String(value);
}

export const STRUCTURED_TABLE_DOCUMENT_IDS = [
  'fmea',
  'hazard_register',
  'safety_function_analysis',
] as const;

export type StructuredTableDocumentId =
  (typeof STRUCTURED_TABLE_DOCUMENT_IDS)[number];

export function isStructuredTableDocumentId(
  id: string
): id is StructuredTableDocumentId {
  return (STRUCTURED_TABLE_DOCUMENT_IDS as readonly string[]).includes(id);
}
