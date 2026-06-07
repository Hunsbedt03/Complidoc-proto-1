import JSZip from 'jszip';
import type { ZipData } from './types';
import { triggerDownload } from './download';

export async function downloadZipWithExtras(
  zipData: ZipData,
  options?: {
    manglerTxt?: string;
    utkast?: boolean;
  }
): Promise<void> {
  let filename = zipData.filename;
  let zipBase64 = zipData.zip;

  if (options?.manglerTxt?.trim()) {
    const zip = await JSZip.loadAsync(zipData.zip, { base64: true });
    zip.file('MANGLER.txt', options.manglerTxt);
    zip.file(
      'LES_MEG_UTKAST.txt',
      'UTKAST — ikke komplett teknisk fil\n\nSe MANGLER.txt for hva som gjenstår.\n'
    );
    zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    if (options.utkast && !filename.includes('utkast')) {
      filename = filename.replace(/\.zip$/i, '_utkast.zip');
    }
  }

  const bytes = atob(zipBase64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  triggerDownload(new Blob([arr], { type: 'application/zip' }), filename);
}
