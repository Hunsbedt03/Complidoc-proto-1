/** Felles metadata for info-tabell i preview, PDF og DOCX. */
export type DocumentExportMeta = {
  title: string;
  project: string;
  machine: string;
  revision: number;
  date: string;
  produsent?: string;
  serienr?: string;
  kunde?: string;
  ingenior?: string;
  documentId?: string;
};

export function buildDocumentNumber(
  documentId: string | undefined,
  serienr: string | undefined,
  revision: number
): string {
  const safeSerial = (serienr ?? '000').replace(/\s/g, '');
  const prefix =
    (documentId ?? 'DOC').slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DOC';
  return `FS-${prefix}-${safeSerial}-Rev${String(revision).padStart(2, '0')}`;
}

export function buildExportInfoRows(meta: DocumentExportMeta): [string, string][] {
  const docNr = buildDocumentNumber(meta.documentId, meta.serienr, meta.revision);
  return [
    ['Dokumentnummer', docNr],
    ['Maskin', meta.machine],
    ['Serienummer', meta.serienr ?? '—'],
    ['Prosjekt', meta.project],
    ['Produsent', meta.produsent ?? '—'],
    ['Kunde', meta.kunde ?? '—'],
    ['Ansvarlig', meta.ingenior ?? '—'],
    ['Revisjon', String(meta.revision)],
    ['Dato', meta.date],
  ];
}
