import type { UploadSlot } from '@/lib/types';

export type UploadDocumentResponse = {
  slot: UploadSlot;
  storage: 'supabase' | 'local';
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Last opp via API (Supabase Storage) med lokal fallback. */
export async function uploadProjectDocument(
  projectId: string,
  documentId: string,
  file: File
): Promise<UploadDocumentResponse> {
  const base64 = await fileToBase64(file);
  const body = JSON.stringify({
    projectId,
    documentId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    fileBase64: base64,
  });

  const useLocalOnly = file.size > 8 * 1024 * 1024;

  if (!useLocalOnly) {
    try {
      const res = await fetch('/api/projects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      let json: {
        error?: string;
        slot?: UploadSlot;
        storage?: 'supabase' | 'local';
      } = {};
      try {
        const text = await res.text();
        if (text.trim()) json = JSON.parse(text);
      } catch {
        /* tom eller ugyldig JSON — faller tilbake til lokal lagring */
      }
      if (res.ok && json.slot) {
        return { slot: json.slot, storage: json.storage ?? 'supabase' };
      }
      // 401/503 = sky ikke tilgjengelig → lokal fallback
      if (!res.ok && res.status !== 503 && res.status !== 401) {
        throw new Error(json.error ?? `Opplasting feilet (${res.status})`);
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('fetch')) {
        throw err;
      }
    }
  }

  return {
    storage: 'local',
    slot: {
      documentId,
      status: 'uploaded',
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileBase64: base64,
    },
  };
}

export async function downloadUploadedFile(slot: UploadSlot): Promise<void> {
  if (slot.filePath && slot.storageRecordId) {
    const res = await fetch(
      `/api/projects/upload/download?recordId=${encodeURIComponent(slot.storageRecordId)}`
    );
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slot.fileName ?? 'document';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  }
  if (slot.fileBase64) {
    const bytes = atob(slot.fileBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: slot.mimeType ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = slot.fileName ?? 'document';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  throw new Error('Fant ikke fil for nedlasting');
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
