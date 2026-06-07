import type { DocumentId } from './ids';
import type { DocumentSourceType } from './source';
import type { ProjectInput } from './suggest';

export type CatalogDocument = {
  id: DocumentId;
  label: string;
  labelEN?: string;
  sourceType: DocumentSourceType;
  required: boolean;
  directive?: string;
  description: string;
  acceptedFormats?: string[];
  zipOrder: number;
  outputFormat: 'docx';
  showWhen?: (input: ProjectInput) => boolean;
};

function marketMatch(input: ProjectInput, keywords: string[]): boolean {
  const m = (input.marked ?? '').toLowerCase();
  return keywords.some((k) => m.includes(k));
}

export const ALL_DOCUMENTS: CatalogDocument[] = [
  {
    id: 'risk_assessment',
    label: 'Risikovurdering',
    labelEN: 'Risk Assessment',
    sourceType: 'ai_generated',
    required: true,
    directive: 'EN ISO 12100:2010',
    description: 'Genereres automatisk basert på maskindata og fareidentifikasjon',
    zipOrder: 1,
    outputFormat: 'docx',
  },
  {
    id: 'technical_file',
    label: 'Teknisk konstruksjonsfil (tekstdel)',
    sourceType: 'ai_generated',
    required: true,
    directive: '2006/42/EF Vedlegg VII',
    description: 'Maskinbeskrivelse, funksjon og driftsgrenser',
    zipOrder: 2,
    outputFormat: 'docx',
  },
  {
    id: 'declaration_of_conformity',
    label: 'EF-Samsvarserklæring',
    labelEN: 'Declaration of Conformity',
    sourceType: 'ai_generated',
    required: true,
    directive: '2006/42/EF Vedlegg II A',
    description: 'Genereres med produsentinfo og relevante direktiver',
    zipOrder: 3,
    outputFormat: 'docx',
  },
  {
    id: 'qc_checklist',
    label: 'QC-sjekkliste',
    sourceType: 'ai_generated',
    required: true,
    description: 'Kvalitetskontroll ved produksjon og leveranse',
    zipOrder: 4,
    outputFormat: 'docx',
  },
  {
    id: 'hazard_register',
    label: 'Fareregister',
    sourceType: 'ai_generated',
    required: true,
    description: 'Identifiserte farer med tiltak og restrisiko',
    zipOrder: 12,
    outputFormat: 'docx',
  },
  {
    id: 'harmonized_standards_matrix',
    label: 'Harmonisert standardliste',
    sourceType: 'ai_generated',
    required: true,
    description: 'Harmoniserte standarder med samsvarsbegrunnelse',
    zipOrder: 8,
    outputFormat: 'docx',
  },
  {
    id: 'user_manual_no',
    label: 'Brukerhåndbok (NO)',
    sourceType: 'ai_generated',
    required: true,
    directive: '2006/42/EF Vedlegg I §1.7.4',
    description: 'Komplett brukermanual på norsk',
    zipOrder: 20,
    outputFormat: 'docx',
  },
  {
    id: 'user_manual_en',
    label: 'Brukerhåndbok (EN)',
    sourceType: 'ai_generated',
    required: false,
    description: 'Komplett brukermanual på engelsk',
    zipOrder: 21,
    outputFormat: 'docx',
  },
  {
    id: 'maintenance_manual',
    label: 'Vedlikeholdsmanual',
    sourceType: 'ai_generated',
    required: false,
    description: 'Serviceintervaller, smøreplan og forebyggende vedlikehold',
    zipOrder: 23,
    outputFormat: 'docx',
  },
  {
    id: 'installation_manual',
    label: 'Installasjonsmanual',
    sourceType: 'ai_generated',
    required: false,
    description: 'Montasje, løft, fundamentering og idriftsettelse',
    zipOrder: 22,
    outputFormat: 'docx',
  },
  {
    id: 'fmea',
    label: 'FMEA',
    sourceType: 'ai_generated',
    required: false,
    description: 'Feilmodus- og konsekvensanalyse',
    zipOrder: 10,
    outputFormat: 'docx',
  },
  {
    id: 'warning_signs_spec',
    label: 'Advarselsteksttabell',
    sourceType: 'ai_generated',
    required: false,
    description: 'Advarselsskilt og tekster (ISO 11684)',
    zipOrder: 31,
    outputFormat: 'docx',
  },
  {
    id: 'function_description',
    label: 'Funksjonsbeskrivelse og driftsgrenser',
    sourceType: 'ai_generated',
    required: false,
    zipOrder: 5,
    outputFormat: 'docx',
    description: 'Funksjon, kapasitet og grenser for maskinen',
  },
  {
    id: 'safety_function_analysis',
    label: 'Safety function-analyse (PL/SIL)',
    sourceType: 'ai_generated',
    required: false,
    zipOrder: 11,
    outputFormat: 'docx',
    description: 'Sikkerhetsfunksjoner etter EN ISO 13849 / IEC 62061',
  },
  {
    id: 'emergency_stop_analysis',
    label: 'Nødstoppanalyse',
    sourceType: 'ai_generated',
    required: false,
    zipOrder: 13,
    outputFormat: 'docx',
    description: 'Nødstopp og sikkerhetskrets',
  },
  {
    id: 'operator_safety_instructions',
    label: 'Sikkerhetsinstruksjoner for operatør',
    sourceType: 'ai_generated',
    required: false,
    zipOrder: 32,
    outputFormat: 'docx',
    description: 'Sikkerhetsregler før og under drift',
  },
  {
    id: 'cad_drawings',
    label: 'Konstruksjonstegninger (CAD)',
    sourceType: 'user_upload',
    required: true,
    directive: '2006/42/EF Vedlegg VII',
    description: 'Generell-, detalj- og monteringstegninger (PDF, DWG, STEP)',
    acceptedFormats: ['pdf', 'dwg', 'dxf', 'step', 'png'],
    zipOrder: 70,
    outputFormat: 'docx',
  },
  {
    id: 'material_certificates',
    label: 'Materialsertifikater',
    sourceType: 'user_upload',
    required: false,
    description: 'EN 10204 3.1 eller 3.2 for strukturelle komponenter',
    acceptedFormats: ['pdf'],
    zipOrder: 71,
    outputFormat: 'docx',
  },
  {
    id: 'lab_test_reports',
    label: 'Laboratorietestrapporter',
    sourceType: 'user_upload',
    required: false,
    description: 'EMC, støy, vibrasjon fra akkreditert lab',
    acceptedFormats: ['pdf'],
    zipOrder: 72,
    outputFormat: 'docx',
    showWhen: (i) =>
      (i.drivsystem ?? '').toLowerCase().includes('v') ||
      (i.drivsystem ?? '').toLowerCase().includes('kw') ||
      (i.drivsystem ?? '').toLowerCase().includes('elektr'),
  },
  {
    id: 'weld_certificates',
    label: 'Sveisesertifikater / NDT-protokoller',
    sourceType: 'user_upload',
    required: false,
    description: 'WPS og NDT-resultater',
    acceptedFormats: ['pdf'],
    zipOrder: 73,
    outputFormat: 'docx',
  },
  {
    id: 'notified_body_cert',
    label: 'Notified Body-sertifikat',
    sourceType: 'user_upload',
    required: false,
    description: 'EU-typeeksaminering (Notified Body)',
    acceptedFormats: ['pdf'],
    zipOrder: 74,
    outputFormat: 'docx',
  },
  {
    id: 'fat_report',
    label: 'FAT-rapport (Factory Acceptance Test)',
    sourceType: 'user_upload',
    required: false,
    description: 'Testrapport og bilder fra akseptansetest',
    acceptedFormats: ['pdf', 'jpg', 'png', 'zip'],
    zipOrder: 75,
    outputFormat: 'docx',
  },
  {
    id: 'component_datasheets',
    label: 'Komponentdatablader',
    sourceType: 'user_upload',
    required: false,
    description: 'Leverandørdokumentasjon for kritiske komponenter',
    acceptedFormats: ['pdf', 'zip'],
    zipOrder: 76,
    outputFormat: 'docx',
  },
  {
    id: 'fem_analysis',
    label: 'FEM/FEA-analyse',
    sourceType: 'user_upload',
    required: false,
    description: 'Elementmetodeanalyse for strukturell integritet',
    acceptedFormats: ['pdf'],
    zipOrder: 77,
    outputFormat: 'docx',
  },
  {
    id: 'test_protocol',
    label: 'Testprotokoll',
    sourceType: 'hybrid',
    required: false,
    description: 'Samsiq genererer skjema — du fyller inn måleresultater',
    acceptedFormats: ['pdf', 'docx'],
    zipOrder: 80,
    outputFormat: 'docx',
  },
  {
    id: 'fat_checklist',
    label: 'FAT-protokoll / akseptansesjekkliste',
    sourceType: 'hybrid',
    required: false,
    description: 'Samsiq genererer sjekkliste — signeres etter test',
    acceptedFormats: ['pdf', 'docx'],
    zipOrder: 81,
    outputFormat: 'docx',
  },
  {
    id: 'inspection_report',
    label: 'Inspeksjonsrapport',
    sourceType: 'hybrid',
    required: false,
    description: 'Samsiq lager mal — du legger til funn og signaturer',
    acceptedFormats: ['pdf', 'docx'],
    zipOrder: 82,
    outputFormat: 'docx',
  },
  {
    id: 'noise_vibration_sheet',
    label: 'Støy- og vibrasjonsmåleskjema',
    sourceType: 'hybrid',
    required: false,
    description: 'Måleprotokoll — lab eller bruker fyller inn verdier',
    acceptedFormats: ['pdf', 'docx', 'xlsx'],
    zipOrder: 83,
    outputFormat: 'docx',
  },
];

export const CATALOG_BY_ID: Record<string, CatalogDocument> = Object.fromEntries(
  ALL_DOCUMENTS.map((d) => [d.id, d])
);

export function getCatalogDocument(id: DocumentId): CatalogDocument | undefined {
  return CATALOG_BY_ID[id];
}

export function getVisibleCatalog(input: ProjectInput): CatalogDocument[] {
  return ALL_DOCUMENTS.filter((d) => !d.showWhen || d.showWhen(input));
}

export function getDocumentsBySource(
  sourceType: DocumentSourceType,
  input: ProjectInput
): CatalogDocument[] {
  return getVisibleCatalog(input).filter((d) => d.sourceType === sourceType);
}

export function getGeneratableIds(ids: DocumentId[]): DocumentId[] {
  return ids.filter((id) => {
    const d = getCatalogDocument(id);
    return d?.sourceType === 'ai_generated' || d?.sourceType === 'hybrid';
  });
}
