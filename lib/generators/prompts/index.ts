import type { DocumentId } from '@/lib/documents/ids';
import { DOCUMENT_ID_TO_LEGACY } from '@/lib/documents/ids';
import { RISK_ASSESSMENT_PROMPT } from './risk_assessment';
import { FMEA_PROMPT } from './fmea';
import { USER_MANUAL_PROMPT_NO } from './user_manual_no';
import { USER_MANUAL_PROMPT_EN } from './user_manual_en';
import { getGenericPrompt } from './generic';
import { withContext } from './base';

const SPECIFIC: Partial<Record<DocumentId, string>> = {
  risk_assessment: RISK_ASSESSMENT_PROMPT,
  fmea: FMEA_PROMPT,
  user_manual_no: USER_MANUAL_PROMPT_NO,
  user_manual_en: USER_MANUAL_PROMPT_EN,
};

/** Legacy inline prompts remain in api until synced; server uses document-prompts.js */
export function getPromptTemplate(id: DocumentId): string {
  return SPECIFIC[id] ?? getGenericPrompt(id);
}

export function buildPromptForDocument(id: DocumentId, machineData: string): string {
  const template = getPromptTemplate(id);
  const context = `=== MASKINDATA FRA BRUKER ===
${machineData}
=== SLUTT MASKINDATA ===`;
  return withContext(template, context);
}

export function getApiPromptKey(id: DocumentId): string {
  const legacy = DOCUMENT_ID_TO_LEGACY[id];
  return legacy ?? id;
}
