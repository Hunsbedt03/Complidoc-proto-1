import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import { fetchDocumentRevisions } from '@/lib/revisions/saveRevision';

function fallbackHtml(documentId: string): string {
  const def = getCatalogDocument(documentId as DocumentId);
  return `<h2>${def?.label ?? documentId}</h2><p>AI-generert dokument. Rediger for å tilpasse før endelig låsing.</p>`;
}

/** Henter siste revisjonsinnhold per dokument fra Supabase. */
export async function hydrateDocumentContents(
  projectId: string,
  documentIds: string[]
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};

  await Promise.all(
    documentIds.map(async (documentId) => {
      try {
        const revisions = await fetchDocumentRevisions(projectId, documentId);
        const latest = revisions[0];
        if (latest?.content?.trim()) {
          contents[documentId] = latest.content.startsWith('<')
            ? latest.content
            : `<p>${latest.content}</p>`;
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
