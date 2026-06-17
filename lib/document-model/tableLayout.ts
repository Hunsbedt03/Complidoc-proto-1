import {
  isStructuredTableDocumentId,
  type StructuredTableDocumentId,
} from '@/lib/document-model/types';

/** A4 portrait innholdsbredde (DXA) — matcher docxBuilder. */
export const DOCX_CONTENT_WIDTH_PORTRAIT = 9638;

/** A4 landscape innholdsbredde (DXA). */
export const DOCX_CONTENT_WIDTH_LANDSCAPE = 16838 - 1134 * 2;

export function isLandscapeDocument(documentId?: string): boolean {
  return isStructuredTableDocumentId(documentId ?? '');
}

export function contentWidthForDocument(documentId?: string): number {
  return isLandscapeDocument(documentId)
    ? DOCX_CONTENT_WIDTH_LANDSCAPE
    : DOCX_CONTENT_WIDTH_PORTRAIT;
}

/** Kolonnebredder som ratio (sum ≈ 100) for kjente brede tabeller. */
const TABLE_LAYOUTS: Partial<Record<StructuredTableDocumentId, number[]>> = {
  fmea: [11, 11, 12, 4, 4, 4, 5, 19, 30],
  hazard_register: [8, 14, 12, 14, 14, 18, 20],
  safety_function_analysis: [16, 6, 14, 8, 6, 18, 16],
};

export function tableColumnWidthRatios(
  headers: string[],
  documentId?: string
): number[] {
  if (documentId && isStructuredTableDocumentId(documentId)) {
    const preset = TABLE_LAYOUTS[documentId];
    if (preset && preset.length === headers.length) return preset;
  }

  const n = Math.max(headers.length, 1);
  const narrow = new Set(['s', 'o', 'd', 'rpn', 'id']);
  const ratios = headers.map((h) => {
    const key = h.trim().toLowerCase();
    if (narrow.has(key) || /^[sod]$/i.test(key)) return 4;
    if (key === 'rpn') return 5;
    return 12;
  });
  const sum = ratios.reduce((a, b) => a + b, 0);
  return ratios.map((r) => Math.round((r / sum) * 100));
}

export function tableColumnWidthsDxa(
  headers: string[],
  documentId?: string,
  contentWidth = contentWidthForDocument(documentId)
): number[] {
  const ratios = tableColumnWidthRatios(headers, documentId);
  const total = ratios.reduce((a, b) => a + b, 0);
  const widths = ratios.map((r) => Math.round((contentWidth * r) / total));
  const drift = contentWidth - widths.reduce((a, b) => a + b, 0);
  if (widths.length && drift !== 0) widths[widths.length - 1] += drift;
  return widths;
}

/** Flex-ratio for @react-pdf/renderer (summerer til innholdsbredden). */
export function tableColumnFlex(
  headers: string[],
  documentId?: string
): number[] {
  return tableColumnWidthRatios(headers, documentId);
}
