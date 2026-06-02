import type { DocType } from './types';

export const DOC_STEPS: { docType: DocType; label: string }[] = [
  { docType: 'risk', label: 'Genererer risikovurdering (EN ISO 12100)...' },
  { docType: 'tech', label: 'Utarbeider teknisk fil...' },
  { docType: 'doc', label: 'Genererer samsvarserklæring...' },
  { docType: 'qc', label: 'Bygger QC-sjekkliste...' },
];

export const DOC_PREFIX_MAP: Record<string, string> = {
  risk: '01_',
  tech: '02_',
  doc: '03_',
  qc: '04_',
};

export const PANEL_TITLES: Record<string, [string, string]> = {
  dashboard: ['Oversikt', 'Dine prosjekter'],
  new: ['Nytt prosjekt', 'Fyll inn maskindata for å generere dokumentpakke'],
  output: ['Dokumentpakke klar', 'Last ned og signer'],
};

export const EMPTY_FORM = {
  prosjekt: '',
  kunde: '',
  produsent: '',
  ingenior: '',
  serienr: '',
  maskin: '',
  beskrivelse: '',
  drivsystem: '',
  styring: '',
  installasjonsmiljo: '',
  tiltenktbruk: '',
  standarder: '',
  marked: '',
};
