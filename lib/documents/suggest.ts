import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import { getCatalogDocument } from './catalog';

export type ProjectInput = {
  drivsystem?: string;
  installasjonsmiljo?: string;
  marked?: string;
  styring?: string;
  maskin?: string;
  beskrivelse?: string;
  tiltenktbruk?: string;
};

function lc(s: string | undefined): string {
  return (s ?? '').toLowerCase();
}

/** Automatisk foreslåtte dokumenter basert på prosjektinput. */
export function suggestDocuments(projectData: ProjectInput): DocumentId[] {
  const suggested = new Set<DocumentId>(CORE_DOCUMENT_IDS);

  const drive = lc(projectData.drivsystem);
  const env = lc(projectData.installasjonsmiljo);
  const market = lc(projectData.marked);

  if (drive.includes('v') || drive.includes('kw') || drive.includes('elektr')) {
    suggested.add('lab_test_reports');
    suggested.add('user_manual_en');
  }

  if (
    env.includes('eksplosiv') ||
    env.includes('atex') ||
    env.includes('ex ')
  ) {
    suggested.add('atex_documentation');
  }

  if (env.includes('fuktig') || env.includes('utendørs') || env.includes('utendors')) {
    suggested.add('maintenance_manual');
  }

  if (
    market.includes('eu') ||
    market.includes('eøs') ||
    market.includes('eos') ||
    market.includes('norge')
  ) {
    suggested.add('user_manual_no');
    suggested.add('user_manual_en');
  }

  if (market.includes('uk') || market.includes('storbritannia')) {
    suggested.add('ukca_declaration');
  }

  if (market.includes('usa') || market.includes('osha') || market.includes('nord-amerika')) {
    suggested.add('osha_sdoc');
  }

  if (market.includes('canada') || market.includes('csa')) {
    suggested.add('csa_documentation');
  }

  if (
    market.includes('australia') ||
    market.includes('new zealand') ||
    market.includes('nz') ||
    market.includes('rcm')
  ) {
    suggested.add('rcm_declaration');
  }

  if (env.includes('trykk') || drive.includes('trykk')) {
    suggested.add('ped_technical_file');
  }

  return [...suggested].filter((id) => {
    const def = getCatalogDocument(id);
    return def?.sourceType === 'ai_generated';
  });
}
