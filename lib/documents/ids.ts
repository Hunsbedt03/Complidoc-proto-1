/** Canonical document type identifiers (Maskindirektivet pakke). */
export type DocumentId =
  | 'risk_assessment'
  | 'technical_file'
  | 'declaration_of_conformity'
  | 'qc_checklist'
  | 'function_description'
  | 'bom'
  | 'calculation_report'
  | 'harmonized_standards_matrix'
  | 'fmea'
  | 'safety_function_analysis'
  | 'hazard_register'
  | 'emergency_stop_analysis'
  | 'user_manual_no'
  | 'user_manual_en'
  | 'installation_manual'
  | 'maintenance_manual'
  | 'spare_parts_list'
  | 'troubleshooting_guide'
  | 'nameplate_design'
  | 'warning_signs_spec'
  | 'operator_safety_instructions'
  | 'quality_control_plan'
  | 'fabrication_drawing_list'
  | 'welding_procedures'
  | 'ndt_protocol'
  | 'production_traceability_log'
  | 'ukca_declaration'
  | 'osha_sdoc'
  | 'csa_documentation'
  | 'rcm_declaration'
  | 'atex_documentation'
  | 'ped_technical_file'
  | 'emc_report'
  | 'low_voltage_checklist'
  | 'rohs_declaration';

/** Legacy API / DB short ids (unchanged for existing projects). */
export type LegacyDocType = 'risk' | 'tech' | 'doc' | 'qc';

export const LEGACY_STORAGE_DOC_TYPES: LegacyDocType[] = ['risk', 'tech', 'doc', 'qc'];

export const CORE_DOCUMENT_IDS: DocumentId[] = [
  'risk_assessment',
  'technical_file',
  'declaration_of_conformity',
  'qc_checklist',
];

export const LEGACY_TO_DOCUMENT_ID: Record<LegacyDocType, DocumentId> = {
  risk: 'risk_assessment',
  tech: 'technical_file',
  doc: 'declaration_of_conformity',
  qc: 'qc_checklist',
};

export const DOCUMENT_ID_TO_LEGACY: Partial<Record<DocumentId, LegacyDocType>> = {
  risk_assessment: 'risk',
  technical_file: 'tech',
  declaration_of_conformity: 'doc',
  qc_checklist: 'qc',
};

const LEGACY_VALUES = new Set<string>(['risk', 'tech', 'doc', 'qc']);

export function normalizeDocumentId(stored: string): DocumentId {
  if (LEGACY_VALUES.has(stored)) {
    return LEGACY_TO_DOCUMENT_ID[stored as LegacyDocType];
  }
  return stored as DocumentId;
}

/** Verdi som lagres i `dokumenter.doc_type` (legacy for de 4 kjernedokumentene). */
export function toStorageDocType(id: string): string {
  const documentId = normalizeDocumentId(id);
  return DOCUMENT_ID_TO_LEGACY[documentId] ?? documentId;
}

export function storageDocType(doc: { documentId?: DocumentId; docType: string }): string {
  return toStorageDocType(doc.documentId ?? doc.docType);
}
