import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import { contentForEditor } from '@/lib/document-model/normalizeForEditor';
import { isPlaceholderRevisionContent } from '@/lib/document-model/normalizeToBlocks';
import { fetchDocumentRevisions } from '@/lib/revisions/saveRevision';

export type HydratedDocumentContent = {
  html: string;
  contentJson: string;
  isPlaceholder: boolean;
};

function fallbackHtml(documentId: string): HydratedDocumentContent {
  const def = getCatalogDocument(documentId as DocumentId);
  const html = `<h2>${def?.label ?? documentId}</h2><p>AI-generert dokument. Rediger for å tilpasse før endelig låsing.</p>`;
  return {
    html,
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    isPlaceholder: true,
  };
}

/** Henter siste revisjonsinnhold per dokument, normalisert for editor/eksport. */
export async function hydrateDocumentContents(
  projectId: string,
  documentIds: string[]
): Promise<Record<string, HydratedDocumentContent>> {
  const contents: Record<string, HydratedDocumentContent> = {};

  await Promise.all(
    documentIds.map(async (documentId) => {
      try {
        const revisions = await fetchDocumentRevisions(projectId, documentId);
        const latest = revisions[0];
        if (latest?.content?.trim()) {
          const normalized = contentForEditor({
            documentId,
            content: latest.content,
            contentJson: latest.contentJson,
            structuredData: latest.structuredData,
          });
          contents[documentId] = {
            html: normalized.html,
            contentJson: normalized.contentJson,
            isPlaceholder: isPlaceholderRevisionContent(latest.content),
          };
          return;
        }
      } catch {
        /* ingen revisjoner ennå */
      }
      contents[documentId] = fallbackHtml(documentId);
    })
  );

  return contents;
}

/** Kun HTML-kart (bakoverkompat for server-side snapshots). */
export async function hydrateDocumentContentsHtml(
  projectId: string,
  documentIds: string[]
): Promise<Record<string, string>> {
  const full = await hydrateDocumentContents(projectId, documentIds);
  return Object.fromEntries(
    Object.entries(full).map(([id, v]) => [id, v.html])
  );
}
