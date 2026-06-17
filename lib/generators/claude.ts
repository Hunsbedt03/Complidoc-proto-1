import type { DocumentId } from '@/lib/documents/ids';
import { LEGACY_TO_DOCUMENT_ID } from '@/lib/documents/ids';
import { buildPromptForDocument } from '@/lib/generators/prompts';
import { buildStructuredPrompt } from '@/lib/generators/prompts/structured';
import { isStructuredTableDocumentId } from '@/lib/document-model/types';
import { buildPromptContext } from '@/lib/generators/machineFields';

const LEGACY_KEYS = new Set(['risk', 'tech', 'doc', 'qc']);

function toDocumentId(resolvedType: string): DocumentId {
  if (LEGACY_KEYS.has(resolvedType)) {
    return LEGACY_TO_DOCUMENT_ID[resolvedType as keyof typeof LEGACY_TO_DOCUMENT_ID];
  }
  return resolvedType as DocumentId;
}

export async function callClaude(
  apiKey: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = (await res.json()) as {
      error?: { message?: string };
      content?: { type: string; text?: string }[];
    };

    if (!res.ok) {
      lastError = new Error(data.error?.message ?? 'Claude API feil');
      if (attempt === 0 && (res.status === 429 || res.status === 529)) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw lastError;
    }

    const block = data.content?.find((b) => b?.type === 'text' && b.text);
    if (!block?.text) {
      throw new Error('Claude returnerte tomt svar');
    }
    return block.text.trim();
  }

  throw lastError ?? new Error('Claude API feil');
}

export function buildGenerationPrompt(
  resolvedType: string,
  machineData: string,
  extraContext?: string
): string {
  const documentId = toDocumentId(resolvedType);
  const context = buildPromptContext(machineData);
  const enrichedContext = extraContext
    ? `${context}\n\n=== EKSTRA KONTEKST ===\n${extraContext}\n=== SLUTT EKSTRA KONTEKST ===`
    : context;

  if (isStructuredTableDocumentId(documentId)) {
    return buildStructuredPrompt(documentId, enrichedContext);
  }
  return buildPromptForDocument(documentId, machineData).replace(
    context,
    enrichedContext
  );
}

export function maxTokensForType(resolvedType: string): number {
  if (
    resolvedType === 'tech' ||
    resolvedType === 'technical_file' ||
    isStructuredTableDocumentId(resolvedType)
  ) {
    return 4096;
  }
  return 3500;
}
