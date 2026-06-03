import JSZip from 'jszip';
import type { GeneratedDoc, ZipData } from './types';

/** Bygg ZIP fra lagrede dokumenter når zip_base64 ikke er lagret i prosjekt. */
export async function rebuildZipFromDocs(
  documents: GeneratedDoc[],
  zipFilename: string
): Promise<ZipData> {
  const folderName = zipFilename.replace(/\.zip$/i, '') || 'Samsiq_export';
  const zip = new JSZip();
  const folder = zip.folder(folderName)!;

  for (const doc of documents) {
    const bytes = atob(doc.docx);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    folder.file(doc.filename, arr);
  }

  const zipB64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
  return { zip: zipB64, filename: zipFilename };
}
