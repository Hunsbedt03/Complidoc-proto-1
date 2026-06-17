import type { GeneratedDoc } from '@/lib/types';
import type { StructuredDocumentData } from '@/lib/document-model/types';

export type RevisionSeedInput = {
  projectId: string;
  document: GeneratedDoc;
  changedByName: string;
  changeType?: 'initial_generation' | 'ai_regeneration' | 'ai';
  changeNote?: string;
};

export function revisionPayloadFromGeneratedDoc(doc: GeneratedDoc): {
  content: string;
  contentJson: string;
  language: 'no' | 'en';
  structuredData?: string;
} {
  const content =
    doc.contentHtml ??
    `<h2>${doc.label ?? doc.documentId}</h2><p>AI-generert dokument.</p>`;
  const contentJson =
    doc.contentJson ?? JSON.stringify({ type: 'doc', content: [] });
  const language = doc.language ?? (doc.documentId === 'user_manual_en' ? 'en' : 'no');
  const structuredData = doc.structuredData;
  return {
    content,
    contentJson,
    language,
    ...(structuredData ? { structuredData } : {}),
  };
}

export function parseStructuredData(raw: string | undefined): StructuredDocumentData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StructuredDocumentData;
  } catch {
    return null;
  }
}
