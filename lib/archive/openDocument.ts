import { requestArchiveViewer } from '@/lib/archive/viewerBridge';

/** Vis arkivdokument inline i Samsiq (PDF iframe / DOCX Tiptap). */
export function openArchiveDocument(
  archiveId: string,
  filePath?: string,
  mimeType?: string,
  fileName?: string,
  label?: string
): void {
  requestArchiveViewer({
    archiveId,
    filePath,
    mimeType,
    fileName,
    label,
  });
}
