import type { DocumentId } from './ids';

/** Tidsestimat per dokumenttype (sekunder). */
export const documentTimeEstimates: Partial<Record<DocumentId, number>> = {
  risk_assessment: 90,
  technical_file: 60,
  declaration_of_conformity: 30,
  qc_checklist: 45,
  function_description: 75,
  bom: 60,
  calculation_report: 90,
  harmonized_standards_matrix: 75,
  fmea: 120,
  safety_function_analysis: 150,
  hazard_register: 90,
  emergency_stop_analysis: 90,
  user_manual_no: 120,
  user_manual_en: 120,
  installation_manual: 90,
  maintenance_manual: 90,
  spare_parts_list: 60,
  troubleshooting_guide: 75,
  nameplate_design: 45,
  warning_signs_spec: 60,
  operator_safety_instructions: 60,
  quality_control_plan: 90,
  fabrication_drawing_list: 60,
  welding_procedures: 75,
  ndt_protocol: 75,
  production_traceability_log: 60,
  ukca_declaration: 30,
  osha_sdoc: 45,
  csa_documentation: 60,
  rcm_declaration: 30,
  atex_documentation: 120,
  ped_technical_file: 90,
  emc_report: 90,
  low_voltage_checklist: 60,
  rohs_declaration: 45,
};

export function estimateTime(selectedDocs: DocumentId[]): string {
  const totalSeconds = selectedDocs.reduce(
    (sum, doc) => sum + (documentTimeEstimates[doc] ?? 60),
    0
  );
  const minutes = Math.max(1, Math.ceil(totalSeconds / 60));
  const n = selectedDocs.length;
  const docWord = n === 1 ? 'dokument' : 'dokumenter';
  return `${n} ${docWord} · Estimert tid: ${minutes}–${minutes + 2} minutter`;
}
