import type { DocumentId } from '@/lib/documents/ids';
import { getAllDocumentDefinitions } from '@/lib/documents/registry';

export const DOC_TITLES: Record<string, string> = {
  risk: 'Risikovurdering',
  tech: 'Teknisk konstruksjonsfil',
  doc: 'EF-Samsvarserklæring',
  qc: 'QC-Sjekkliste',
  function_description: 'Funksjonsbeskrivelse',
  bom: 'Stykkliste (BOM)',
  calculation_report: 'Beregningsrapport',
  harmonized_standards_matrix: 'Standardliste og samsvarsmatrise',
  fmea: 'FMEA',
  safety_function_analysis: 'Safety function-analyse',
  hazard_register: 'Fareregister',
  emergency_stop_analysis: 'Nødstoppanalyse',
  user_manual_no: 'Brukerhåndbok (NO)',
  user_manual_en: 'User manual (EN)',
  installation_manual: 'Installasjonsmanual',
  maintenance_manual: 'Vedlikeholdsmanual',
  spare_parts_list: 'Reservedelsliste',
  troubleshooting_guide: 'Feilsøkingsguide',
  nameplate_design: 'Merkeplatedesign',
  warning_signs_spec: 'Advarselsskilt',
  operator_safety_instructions: 'Sikkerhetsinstruksjoner operatør',
  quality_control_plan: 'Kvalitetskontrollplan',
  fabrication_drawing_list: 'Tegningsliste',
  welding_procedures: 'Sveiseprosedyrer',
  ndt_protocol: 'NDT-protokoll',
  production_traceability_log: 'Produksjonslogg',
  ukca_declaration: 'UKCA Declaration',
  osha_sdoc: 'OSHA SDoC',
  csa_documentation: 'CSA dokumentasjon',
  rcm_declaration: 'RCM Declaration',
  atex_documentation: 'ATEX dokumentasjon',
  ped_technical_file: 'PED-teknisk fil',
  emc_report: 'EMC-testrapport',
  low_voltage_checklist: 'LVD-sjekkliste',
  rohs_declaration: 'RoHS-erklæring',
  test_protocol: 'Testprotokoll',
  fat_checklist: 'FAT-protokoll',
  inspection_report: 'Inspeksjonsrapport',
  noise_vibration_sheet: 'Støy/vibrasjon',
};

const LEGACY_ALIAS: Record<string, string> = {
  risk_assessment: 'risk',
  technical_file: 'tech',
  declaration_of_conformity: 'doc',
  qc_checklist: 'qc',
};

export function resolveGenerateDocType(docType: string): string {
  return LEGACY_ALIAS[docType] ?? docType;
}

export function getValidDocTypes(): string[] {
  const ids = getAllDocumentDefinitions()
    .filter((d) => d.sourceType === 'ai_generated' || d.sourceType === 'hybrid')
    .map((d) => resolveGenerateDocType(d.id));
  return ['risk', 'tech', 'doc', 'qc', ...new Set(ids.filter((id) => !['risk', 'tech', 'doc', 'qc'].includes(id)))];
}

export function getDocTitle(resolvedType: string): string {
  return DOC_TITLES[resolvedType] ?? resolvedType;
}

export const ORDER_MAP: Record<string, string> = {
  risk: '01',
  tech: '02',
  doc: '03',
  qc: '04',
  function_description: '05',
  bom: '06',
  calculation_report: '07',
  harmonized_standards_matrix: '08',
  fmea: '10',
  safety_function_analysis: '11',
  hazard_register: '12',
  emergency_stop_analysis: '13',
  user_manual_no: '20',
  user_manual_en: '21',
  installation_manual: '22',
  maintenance_manual: '23',
  spare_parts_list: '24',
  troubleshooting_guide: '25',
  nameplate_design: '30',
  warning_signs_spec: '31',
  operator_safety_instructions: '32',
  quality_control_plan: '40',
  fabrication_drawing_list: '41',
  welding_procedures: '42',
  ndt_protocol: '43',
  production_traceability_log: '44',
  ukca_declaration: '50',
  osha_sdoc: '51',
  csa_documentation: '52',
  rcm_declaration: '53',
  atex_documentation: '60',
  ped_technical_file: '61',
  emc_report: '62',
  low_voltage_checklist: '63',
  rohs_declaration: '64',
};

export function buildFilename(resolvedType: string, safeSerial: string): string {
  const order = ORDER_MAP[resolvedType] ?? '99';
  const slug = getDocTitle(resolvedType)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '')
    .slice(0, 36);
  return `${order}_${slug}_${safeSerial}.docx`;
}

export function documentLanguage(documentId: DocumentId | string): 'no' | 'en' {
  return documentId === 'user_manual_en' ? 'en' : 'no';
}
