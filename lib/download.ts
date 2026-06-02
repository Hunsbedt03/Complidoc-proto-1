import JSZip from 'jszip';
import { DOC_PREFIX_MAP } from './constants';
import type { ZipData } from './types';

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadZip(zipData: ZipData) {
  const bytes = atob(zipData.zip);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  triggerDownload(new Blob([arr], { type: 'application/zip' }), zipData.filename);
}

export async function downloadDocFromZip(zipData: ZipData, prefix: string) {
  const p = DOC_PREFIX_MAP[prefix] || prefix;
  const zip = await JSZip.loadAsync(zipData.zip, { base64: true });
  let targetFile: JSZip.JSZipObject | null = null;
  zip.forEach((path, file) => {
    if (!file.dir && path.includes(p)) targetFile = file;
  });
  if (!targetFile) throw new Error('Fant ikke filen i pakken.');
  const blob = await targetFile.async('blob');
  triggerDownload(
    new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    targetFile.name.split('/').pop()!
  );
}
