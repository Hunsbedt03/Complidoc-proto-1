import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import type { ProjectInput } from './suggest';

export type DocumentGroupId =
  | 'technical'
  | 'safety'
  | 'user'
  | 'marking'
  | 'production'
  | 'market'
  | 'directives';

export type DocumentDefinition = {
  id: DocumentId;
  label: string;
  defaultChecked?: boolean;
  /** Fil-prefix i ZIP (numerisk rekkefølge). */
  zipOrder: number;
  outputFormat: 'docx';
};

export type DocumentGroup = {
  id: DocumentGroupId;
  title: string;
  documents: DocumentDefinition[];
  visible?: (input: ProjectInput) => boolean;
};

function marketVisible(
  input: ProjectInput,
  keywords: string[]
): boolean {
  const m = (input.marked ?? '').toLowerCase();
  if (!m.trim()) return false;
  return keywords.some((k) => m.includes(k));
}

export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    id: 'technical',
    title: 'Teknisk dokumentasjon (alltid påkrevd)',
    documents: [
      {
        id: 'risk_assessment',
        label: 'Risikovurdering (EN ISO 12100)',
        defaultChecked: true,
        zipOrder: 1,
        outputFormat: 'docx',
      },
      {
        id: 'technical_file',
        label: 'Teknisk konstruksjonsfil (2006/42/EF Vedlegg VII)',
        defaultChecked: true,
        zipOrder: 2,
        outputFormat: 'docx',
      },
      {
        id: 'declaration_of_conformity',
        label: 'EF-Samsvarserklæring (NO + EN)',
        defaultChecked: true,
        zipOrder: 3,
        outputFormat: 'docx',
      },
      {
        id: 'qc_checklist',
        label: 'QC-sjekkliste',
        defaultChecked: true,
        zipOrder: 4,
        outputFormat: 'docx',
      },
      {
        id: 'function_description',
        label: 'Funksjonsbeskrivelse og driftsgrenser',
        zipOrder: 5,
        outputFormat: 'docx',
      },
      {
        id: 'bom',
        label: 'Stykkliste (BOM) med komponentspesifikasjoner',
        zipOrder: 6,
        outputFormat: 'docx',
      },
      {
        id: 'calculation_report',
        label: 'Beregningsrapport (styrke, last, mekanikk)',
        zipOrder: 7,
        outputFormat: 'docx',
      },
      {
        id: 'harmonized_standards_matrix',
        label: 'Harmonisert standardliste med samsvarsmatrise',
        zipOrder: 8,
        outputFormat: 'docx',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Sikkerhetsdokumentasjon',
    documents: [
      { id: 'fmea', label: 'FMEA (Failure Mode and Effects Analysis)', zipOrder: 10, outputFormat: 'docx' },
      {
        id: 'safety_function_analysis',
        label: 'Safety function-analyse (PL/SIL etter EN ISO 13849 / IEC 62061)',
        zipOrder: 11,
        outputFormat: 'docx',
      },
      {
        id: 'hazard_register',
        label: 'Fareregister med restrisikodokumentasjon',
        zipOrder: 12,
        outputFormat: 'docx',
      },
      {
        id: 'emergency_stop_analysis',
        label: 'Nødstoppanalyse og sikkerhetskretsdiagram',
        zipOrder: 13,
        outputFormat: 'docx',
      },
    ],
  },
  {
    id: 'user',
    title: 'Brukerdokumentasjon (krav i Vedlegg I §1.7.4)',
    documents: [
      { id: 'user_manual_no', label: 'Brukerhåndbok (NO)', zipOrder: 20, outputFormat: 'docx' },
      { id: 'user_manual_en', label: 'Brukerhåndbok (EN)', zipOrder: 21, outputFormat: 'docx' },
      {
        id: 'installation_manual',
        label: 'Installasjons- og idriftsettelsesmanual',
        zipOrder: 22,
        outputFormat: 'docx',
      },
      {
        id: 'maintenance_manual',
        label: 'Vedlikeholdsmanual med serviceintervaller',
        zipOrder: 23,
        outputFormat: 'docx',
      },
      {
        id: 'spare_parts_list',
        label: 'Reservedelsliste med bestillingsnummer',
        zipOrder: 24,
        outputFormat: 'docx',
      },
      { id: 'troubleshooting_guide', label: 'Feilsøkingsguide', zipOrder: 25, outputFormat: 'docx' },
    ],
  },
  {
    id: 'marking',
    title: 'Merking og sikkerhetskilt',
    documents: [
      {
        id: 'nameplate_design',
        label: 'Merkeplatedesign (CE-merke, serienummer, data)',
        zipOrder: 30,
        outputFormat: 'docx',
      },
      {
        id: 'warning_signs_spec',
        label: 'Advarselsskilt og piktogramspesifikasjon (ISO 11684)',
        zipOrder: 31,
        outputFormat: 'docx',
      },
      {
        id: 'operator_safety_instructions',
        label: 'Sikkerhetsinstruksjoner for operatør',
        zipOrder: 32,
        outputFormat: 'docx',
      },
    ],
  },
  {
    id: 'production',
    title: 'Produksjon og kvalitet',
    documents: [
      {
        id: 'quality_control_plan',
        label: 'Kvalitetskontrollplan (ITP – Inspection and Test Plan)',
        zipOrder: 40,
        outputFormat: 'docx',
      },
      {
        id: 'fabrication_drawing_list',
        label: 'Fabrikasjonstegningsliste og revisjonskontroll',
        zipOrder: 41,
        outputFormat: 'docx',
      },
      {
        id: 'welding_procedures',
        label: 'Sveise- og skjøteprosedyrer (hvis relevant)',
        zipOrder: 42,
        outputFormat: 'docx',
      },
      {
        id: 'ndt_protocol',
        label: 'NDT-protokoll (ikke-destruktiv testing, hvis relevant)',
        zipOrder: 43,
        outputFormat: 'docx',
      },
      {
        id: 'production_traceability_log',
        label: 'Produksjons- og sporingslogg',
        zipOrder: 44,
        outputFormat: 'docx',
      },
    ],
  },
  {
    id: 'market',
    title: 'Marked',
    visible: (input) =>
      marketVisible(input, [
        'uk',
        'storbritannia',
        'usa',
        'osha',
        'canada',
        'csa',
        'australia',
        'new zealand',
        'nz',
        'rcm',
      ]),
    documents: [
      {
        id: 'ukca_declaration',
        label: 'UKCA Declaration of Conformity (UK-marked)',
        zipOrder: 50,
        outputFormat: 'docx',
      },
      {
        id: 'osha_sdoc',
        label: "Supplier's Declaration of Conformity – OSHA (USA)",
        zipOrder: 51,
        outputFormat: 'docx',
      },
      {
        id: 'csa_documentation',
        label: 'CSA-samsvarsdokumentasjon (Canada)',
        zipOrder: 52,
        outputFormat: 'docx',
      },
      {
        id: 'rcm_declaration',
        label: 'RCM Declaration (Australia/NZ)',
        zipOrder: 53,
        outputFormat: 'docx',
      },
    ],
  },
  {
    id: 'directives',
    title: 'Spesialdirektiver',
    visible: (input) => {
      const env = (input.installasjonsmiljo ?? '').toLowerCase();
      const drive = (input.drivsystem ?? '').toLowerCase();
      return (
        env.includes('eksplosiv') ||
        env.includes('atex') ||
        env.includes('ex ') ||
        env.includes('trykk') ||
        drive.includes('v') ||
        drive.includes('kw') ||
        drive.includes('elektr') ||
        drive.includes('trykk')
      );
    },
    documents: [
      {
        id: 'atex_documentation',
        label: 'ATEX-sertifiseringsdokumentasjon (2014/34/EU)',
        zipOrder: 60,
        outputFormat: 'docx',
      },
      {
        id: 'ped_technical_file',
        label: 'PED-teknisk fil (2014/68/EU)',
        zipOrder: 61,
        outputFormat: 'docx',
      },
      {
        id: 'emc_report',
        label: 'EMC-testrapport (2014/30/EU)',
        zipOrder: 62,
        outputFormat: 'docx',
      },
      {
        id: 'low_voltage_checklist',
        label: 'Lavspenningsdirektiv-sjekkliste (2014/35/EU)',
        zipOrder: 63,
        outputFormat: 'docx',
      },
      {
        id: 'rohs_declaration',
        label: 'RoHS-samsvarserklæring (2011/65/EU)',
        zipOrder: 64,
        outputFormat: 'docx',
      },
    ],
  },
];

export function getAllDocumentDefinitions(): DocumentDefinition[] {
  return DOCUMENT_GROUPS.flatMap((g) => g.documents);
}

export function getDocumentDefinition(id: DocumentId): DocumentDefinition | undefined {
  return getAllDocumentDefinitions().find((d) => d.id === id);
}

export function getDefaultSelectedDocuments(): DocumentId[] {
  return [...CORE_DOCUMENT_IDS];
}

export function getVisibleGroups(input: ProjectInput): DocumentGroup[] {
  return DOCUMENT_GROUPS.filter((g) => !g.visible || g.visible(input));
}

export function isMarketDocumentVisible(
  id: DocumentId,
  input: ProjectInput
): boolean {
  const m = (input.marked ?? '').toLowerCase();
  if (!m.trim()) return false;
  switch (id) {
    case 'ukca_declaration':
      return m.includes('uk') || m.includes('storbritannia');
    case 'osha_sdoc':
      return m.includes('usa') || m.includes('osha');
    case 'csa_documentation':
      return m.includes('canada') || m.includes('csa');
    case 'rcm_declaration':
      return (
        m.includes('australia') ||
        m.includes('new zealand') ||
        m.includes(' nz') ||
        m.startsWith('nz') ||
        m.includes('rcm')
      );
    default:
      return true;
  }
}

export function isDirectiveDocumentVisible(
  id: DocumentId,
  input: ProjectInput
): boolean {
  const env = (input.installasjonsmiljo ?? '').toLowerCase();
  const drive = (input.drivsystem ?? '').toLowerCase();
  switch (id) {
    case 'atex_documentation':
      return (
        env.includes('eksplosiv') ||
        env.includes('atex') ||
        env.includes('ex ')
      );
    case 'ped_technical_file':
      return env.includes('trykk') || drive.includes('trykk');
    case 'emc_report':
    case 'low_voltage_checklist':
    case 'rohs_declaration':
      return (
        drive.includes('v') ||
        drive.includes('kw') ||
        drive.includes('elektr')
      );
    default:
      return true;
  }
}

export function isDocumentVisibleInChecklist(
  id: DocumentId,
  input: ProjectInput
): boolean {
  const def = getDocumentDefinition(id);
  if (!def) return false;
  const group = DOCUMENT_GROUPS.find((g) => g.documents.some((d) => d.id === id));
  if (group?.visible && !group.visible(input)) return false;
  if (group?.id === 'market' && !isMarketDocumentVisible(id, input)) return false;
  if (group?.id === 'directives' && !isDirectiveDocumentVisible(id, input)) return false;
  return true;
}

/** API docType sent to /api/generate (legacy short id or canonical id). */
export function resolveApiDocType(id: DocumentId): string {
  const legacy = {
    risk_assessment: 'risk',
    technical_file: 'tech',
    declaration_of_conformity: 'doc',
    qc_checklist: 'qc',
  } as const;
  return legacy[id as keyof typeof legacy] ?? id;
}

export function buildZipFilename(
  id: DocumentId,
  safeSerial: string
): string {
  const def = getDocumentDefinition(id);
  const order = String(def?.zipOrder ?? 99).padStart(2, '0');
  const slug = id.replace(/_/g, '-');
  const label = def?.label.split('(')[0].trim().replace(/\s+/g, '_') ?? id;
  const short = label.slice(0, 40).replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '');
  return `${order}_${short}_${safeSerial}.docx`;
}
