import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import { getCatalogDocument } from './catalog';
import type { ProjectContext } from './types';

export type ProjectInput = ProjectContext;

function lc(s: string | undefined): string {
  return (s ?? '').toLowerCase();
}

/** Automatisk foreslåtte dokumenter basert på prosjektinput. */
export function suggestDocuments(projectData: ProjectContext): DocumentId[] {
  const suggested = new Set<DocumentId>(CORE_DOCUMENT_IDS);

  const drive = lc(projectData.drivsystem);
  const env = lc(projectData.installasjonsmiljo);
  const market = lc(projectData.marked);

  if (drive.includes('v') || drive.includes('kw') || drive.includes('elektr')) {
    suggested.add('lab_test_reports');
    suggested.add('user_manual_en');
    suggested.add('emc_report');
    suggested.add('electrical_diagrams');
  }

  if (
    env.includes('eksplosiv') ||
    env.includes('atex') ||
    env.includes('ex ')
  ) {
    suggested.add('atex_cert');
    suggested.add('atex_manual');
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
    suggested.add('ul_listing');
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
    suggested.add('pressure_test_protocol');
  }

  if (
    lc(projectData.maskin).includes('løft') ||
    lc(projectData.tiltenktbruk).includes('løft')
  ) {
    suggested.add('load_test_report');
  }

  return [...suggested].filter((id) => {
    const def = getCatalogDocument(id);
    return def?.sourceType === 'ai_generated';
  });
}
