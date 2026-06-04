import type { DocumentId } from '@/lib/documents/ids';
import { getAllDocumentDefinitions } from '@/lib/documents/registry';
import { getPromptTemplate } from './prompts';

export type DocumentGenerator = {
  id: DocumentId;
  label: string;
  systemPrompt: string;
  outputFormat: 'docx';
  sections: string[];
};

const SECTIONS: Partial<Record<DocumentId, string[]>> = {
  risk_assessment: [
    'scope',
    'hazard_identification',
    'risk_estimation',
    'risk_reduction',
    'residual_risk',
    'standards_applied',
  ],
  technical_file: [
    'product_id',
    'description',
    'directives',
    'standards',
    'drawings',
    'installation',
    'maintenance',
  ],
  declaration_of_conformity: [
    'manufacturer_info',
    'machine_description',
    'directives_applied',
    'standards_applied',
    'signature',
  ],
  qc_checklist: ['project', 'mechanical', 'electrical', 'safety', 'marking', 'approval'],
  fmea: [
    'component_list',
    'failure_modes',
    'effects',
    'severity',
    'occurrence',
    'detection',
    'rpn',
    'actions',
  ],
  user_manual_no: [
    'introduction',
    'safety_instructions',
    'installation',
    'operation',
    'maintenance',
    'troubleshooting',
    'disposal',
  ],
  user_manual_en: [
    'introduction',
    'safety_instructions',
    'installation',
    'operation',
    'maintenance',
    'troubleshooting',
    'disposal',
  ],
};

function defaultSections(id: DocumentId): string[] {
  return SECTIONS[id] ?? ['overview', 'requirements', 'content', 'references'];
}

export const documentGenerators: Record<DocumentId, DocumentGenerator> = {} as Record<
  DocumentId,
  DocumentGenerator
>;

for (const def of getAllDocumentDefinitions()) {
  documentGenerators[def.id] = {
    id: def.id,
    label: def.label,
    systemPrompt: getPromptTemplate(def.id),
    outputFormat: 'docx',
    sections: defaultSections(def.id),
  };
}
