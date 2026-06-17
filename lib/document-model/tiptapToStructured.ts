import { tiptapToBlocks } from '@/lib/document-model/tiptapToBlocks';
import type {
  FmeaRow,
  FareregisterRow,
  SikkerhetsfunksjonRow,
  StructuredDocumentData,
  StructuredTableDocumentId,
} from '@/lib/document-model/types';

function cell(row: string[], index: number): string {
  return row[index]?.trim() ?? '';
}

function parseNumberOrMangler(value: string): number | string {
  const v = value.trim();
  if (!v || v === '—') return 'MANGLER';
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  return v;
}

export function blocksToStructuredData(
  documentId: StructuredTableDocumentId,
  tiptapJson: unknown
): StructuredDocumentData | null {
  const blocks = tiptapToBlocks(tiptapJson);
  const table = blocks.find((b) => b.type === 'table');
  if (!table || table.type !== 'table') return null;

  switch (documentId) {
    case 'fmea': {
      const rows: FmeaRow[] = table.rows.map((row) => ({
        komponent: cell(row, 0),
        feilmodus: cell(row, 1),
        effekt: cell(row, 2),
        alvorlighet: parseNumberOrMangler(cell(row, 3)),
        sannsynlighet: parseNumberOrMangler(cell(row, 4)),
        detekterbarhet: parseNumberOrMangler(cell(row, 5)),
        rpn: parseNumberOrMangler(cell(row, 6)),
        tiltak: cell(row, 7),
        notat: cell(row, 8) || undefined,
      }));
      return rows.length ? { kind: 'fmea', rows } : null;
    }
    case 'hazard_register': {
      const rows: FareregisterRow[] = table.rows.map((row) => ({
        fareId: cell(row, 0),
        faretype: cell(row, 1),
        livssyklusfase: cell(row, 2),
        eksponertePersoner: cell(row, 3),
        risikoForeTiltak: cell(row, 4),
        tiltak: cell(row, 5),
        residualrisiko: cell(row, 6),
      }));
      return rows.length ? { kind: 'hazard_register', rows } : null;
    }
    case 'safety_function_analysis': {
      const rows: SikkerhetsfunksjonRow[] = table.rows.map((row) => {
        const kat = cell(row, 1);
        const validKat =
          kat === 'B' || kat === '1' || kat === '2' || kat === '3' || kat === '4'
            ? kat
            : 'MANGLER';
        return {
          funksjon: cell(row, 0),
          kategori: validKat,
          arkitektur: cell(row, 2),
          mttfd: cell(row, 3) || 'MANGLER',
          dc: cell(row, 4) || 'MANGLER',
          ccfTiltak: cell(row, 5),
          resultatPlEllerSil: cell(row, 6) || 'MANGLER',
        };
      });
      return rows.length
        ? { kind: 'safety_function_analysis', rows }
        : null;
    }
    default:
      return null;
  }
}

export function tiptapJsonToStructuredData(
  documentId: string,
  tiptapJson: unknown
): StructuredDocumentData | null {
  const ids: StructuredTableDocumentId[] = [
    'fmea',
    'hazard_register',
    'safety_function_analysis',
  ];
  if (!ids.includes(documentId as StructuredTableDocumentId)) return null;
  try {
    const parsed =
      typeof tiptapJson === 'string' ? JSON.parse(tiptapJson) : tiptapJson;
    return blocksToStructuredData(
      documentId as StructuredTableDocumentId,
      parsed
    );
  } catch {
    return null;
  }
}
