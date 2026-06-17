import type {
  DocumentBlock,
  FmeaRow,
  FareregisterRow,
  SikkerhetsfunksjonRow,
  StructuredDocumentData,
} from '@/lib/document-model/types';
import { formatCellValue } from '@/lib/document-model/types';

export function fmeaRowsToBlocks(rows: FmeaRow[]): DocumentBlock[] {
  return [
    {
      type: 'table',
      headers: [
        'Komponent',
        'Feilmodus',
        'Effekt',
        'S',
        'O',
        'D',
        'RPN',
        'Tiltak',
        'Notat',
      ],
      rows: rows.map((r) => [
        r.komponent,
        r.feilmodus,
        r.effekt,
        formatCellValue(r.alvorlighet),
        formatCellValue(r.sannsynlighet),
        formatCellValue(r.detekterbarhet),
        formatCellValue(r.rpn),
        r.tiltak,
        r.notat ?? '',
      ]),
    },
  ];
}

export function fareregisterRowsToBlocks(rows: FareregisterRow[]): DocumentBlock[] {
  return [
    {
      type: 'table',
      headers: [
        'Fare-ID',
        'Faretype',
        'Livssyklusfase',
        'Eksponerte personer',
        'Risiko før tiltak',
        'Tiltak',
        'Residualrisiko',
      ],
      rows: rows.map((r) => [
        r.fareId,
        r.faretype,
        r.livssyklusfase,
        r.eksponertePersoner,
        r.risikoForeTiltak,
        r.tiltak,
        r.residualrisiko,
      ]),
    },
  ];
}

export function sikkerhetsfunksjonRowsToBlocks(
  rows: SikkerhetsfunksjonRow[]
): DocumentBlock[] {
  return [
    {
      type: 'table',
      headers: [
        'Funksjon',
        'Kategori',
        'Arkitektur',
        'MTTFd',
        'DC',
        'CCF-tiltak',
        'PL/SIL',
      ],
      rows: rows.map((r) => [
        r.funksjon,
        formatCellValue(r.kategori),
        r.arkitektur,
        formatCellValue(r.mttfd),
        formatCellValue(r.dc),
        r.ccfTiltak,
        formatCellValue(r.resultatPlEllerSil),
      ]),
    },
  ];
}

export function structuredDataToBlocks(data: StructuredDocumentData): DocumentBlock[] {
  switch (data.kind) {
    case 'fmea':
      return fmeaRowsToBlocks(data.rows);
    case 'hazard_register':
      return fareregisterRowsToBlocks(data.rows);
    case 'safety_function_analysis':
      return sikkerhetsfunksjonRowsToBlocks(data.rows);
    default:
      return [];
  }
}
