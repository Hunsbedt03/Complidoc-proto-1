import JSZip from 'jszip';
import type { ProjectAttachment } from '@/lib/attachments/types';
import type { DocumentId } from '@/lib/documents/ids';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { fetchAttachmentBlob } from '@/lib/attachments/client';

export type ZipAttachmentEntry = {
  zipPath: string;
  data: Uint8Array;
};

/** Henter binærdata for vedlegg koblet til compliance-dokumenter (for ZIP-eksport). */
export async function loadLinkedAttachmentsForZip(
  projectId: string,
  attachments: ProjectAttachment[]
): Promise<ZipAttachmentEntry[]> {
  const linked = attachments.filter((a) => a.linkedDocumentId);
  const entries: ZipAttachmentEntry[] = [];

  for (const att of linked) {
    try {
      const blob = await fetchAttachmentBlob(projectId, att.id);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const docLabel =
        getCatalogDocument(att.linkedDocumentId as DocumentId)?.label ??
        att.linkedDocumentId ??
        'vedlegg';
      const safeDoc = docLabel.replace(/[^a-zA-Z0-9æøåÆØÅ _-]/g, '_');
      const safeName = att.fileName.replace(/[/\\]/g, '_');
      entries.push({
        zipPath: `vedlegg/${safeDoc}/${safeName}`,
        data: buf,
      });
    } catch (err) {
      console.warn('[samsiq] zip attachment skip:', att.fileName, err);
    }
  }

  return entries;
}

export async function mergeAttachmentsIntoZipBase64(
  zipBase64: string,
  entries: ZipAttachmentEntry[]
): Promise<string> {
  if (!entries.length) return zipBase64;
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });
  const rootName = Object.keys(zip.files).find((p) => zip.files[p].dir)?.replace(/\/$/, '');
  for (const entry of entries) {
    const path = rootName ? `${rootName}/${entry.zipPath}` : entry.zipPath;
    zip.file(path, entry.data);
  }
  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
}
