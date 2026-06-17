import 'server-only';

import type { DocumentId } from '@/lib/documents/ids';
import { LEGACY_TO_DOCUMENT_ID } from '@/lib/documents/ids';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  blocksToHtml,
  blocksToTiptap,
  structuredDataToBlocks,
} from '@/lib/document-model';
import type { StructuredDocumentData } from '@/lib/document-model/types';
import { isStructuredTableDocumentId } from '@/lib/document-model/types';
import {
  buildFilename,
  documentLanguage,
  getValidDocTypes,
  resolveGenerateDocType,
} from '@/lib/generators/constants';
import { parseMachineFields } from '@/lib/generators/machineFields';
import {
  buildGenerationPrompt,
  callClaude,
  maxTokensForType,
} from '@/lib/generators/claude';
import { buildDocxBuffer } from '@/lib/generators/docxBuilder';
import {
  markdownToHtml,
  parseStructuredResponse,
} from '@/lib/generators/parseStructuredResponse';
import { getCatalogDocument } from '@/lib/documents/catalog';

export type GenerateRequestBody = {
  machineData?: string;
  docType?: string;
  projectId?: string;
};

export type GenerateResponse = {
  docType: string;
  docx: string;
  filename: string;
  contentHtml: string;
  contentJson: string;
  language: 'no' | 'en';
  structuredData?: StructuredDocumentData;
};

async function fetchRiskAssessmentContext(projectId: string): Promise<string | undefined> {
  const admin = createAdminClient();
  if (!admin) return undefined;
  const { data } = await admin
    .from('document_revisions')
    .select('content')
    .eq('project_id', projectId)
    .eq('document_id', 'risk_assessment')
    .order('revision', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.content) return undefined;
  return `Eksisterende risikovurdering (HTML):\n${data.content.slice(0, 12000)}`;
}

function toDocumentId(resolvedType: string): DocumentId {
  const legacy = ['risk', 'tech', 'doc', 'qc'] as const;
  if ((legacy as readonly string[]).includes(resolvedType)) {
    return LEGACY_TO_DOCUMENT_ID[resolvedType as keyof typeof LEGACY_TO_DOCUMENT_ID];
  }
  return resolvedType as DocumentId;
}

function buildEditorContent(
  documentId: DocumentId,
  aiText: string,
  structured: StructuredDocumentData | null
): { contentHtml: string; contentJson: string } {
  const label = getCatalogDocument(documentId)?.label ?? documentId;

  if (structured) {
    const blocks = structuredDataToBlocks(structured);
    const tiptap = blocksToTiptap([
      { type: 'heading', level: 2, text: label },
      ...blocks,
    ]);
    return {
      contentHtml: `<h2>${label}</h2>\n${blocksToHtml(blocks)}`,
      contentJson: JSON.stringify(tiptap),
    };
  }

  const html = `<h2>${label}</h2>\n${markdownToHtml(aiText)}`;
  const tiptap = blocksToTiptap([
    { type: 'heading', level: 2, text: label },
    ...markdownToBlocksSimple(aiText),
  ]);
  return { contentHtml: html, contentJson: JSON.stringify(tiptap) };
}

function markdownToBlocksSimple(text: string): import('@/lib/document-model/types').DocumentBlock[] {
  const lines = text.split('\n');
  const blocks: import('@/lib/document-model/types').DocumentBlock[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('## ')) blocks.push({ type: 'heading', level: 2, text: t.slice(3) });
    else if (t.startsWith('# ')) blocks.push({ type: 'heading', level: 1, text: t.slice(2) });
    else if (t.startsWith('- ')) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list' && !last.ordered) last.items.push(t.slice(2));
      else blocks.push({ type: 'list', ordered: false, items: [t.slice(2)] });
    } else blocks.push({ type: 'paragraph', text: t });
  }
  return blocks;
}

export async function handleGenerate(body: GenerateRequestBody): Promise<GenerateResponse> {
  const { machineData, docType, projectId } = body;
  if (!machineData) throw new Error('Mangler maskindata');
  if (!docType) throw new Error('Bruk docType');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Mangler ANTHROPIC_API_KEY på server');

  const resolvedType = resolveGenerateDocType(docType);
  if (!getValidDocTypes().includes(resolvedType)) {
    throw new Error('Ugyldig docType: ' + docType);
  }

  const documentId = toDocumentId(resolvedType);
  let extraContext: string | undefined;
  if (resolvedType === 'hazard_register' && projectId) {
    extraContext = await fetchRiskAssessmentContext(projectId);
  }

  const prompt = buildGenerationPrompt(resolvedType, machineData, extraContext);
  const aiText = await callClaude(apiKey, prompt, maxTokensForType(resolvedType));

  let structured: StructuredDocumentData | null = null;
  if (isStructuredTableDocumentId(documentId)) {
    structured = parseStructuredResponse(aiText, documentId);
  }

  const d = parseMachineFields(machineData);
  const safeSerial = d.serienr.replace(/[^a-zA-Z0-9]/g, '_');
  const buf = await buildDocxBuffer(resolvedType, d, aiText, structured);
  const { contentHtml, contentJson } = buildEditorContent(documentId, aiText, structured);

  return {
    docType,
    docx: buf.toString('base64'),
    filename: buildFilename(resolvedType, safeSerial),
    contentHtml,
    contentJson,
    language: documentLanguage(documentId),
    ...(structured ? { structuredData: structured } : {}),
  };
}

export function generateHealthCheck() {
  return {
    ok: true,
    version: 'v11-ts-prompts',
    buildTag: 'prompt-19-ts-handler',
    validDocTypes: getValidDocTypes().length,
    maxDuration: 120,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  };
}
