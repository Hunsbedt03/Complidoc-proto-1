import type { ProjectAttachment } from '@/lib/attachments/types';
import { MAX_ATTACHMENT_BYTES } from '@/lib/attachments/constants';

export async function fetchProjectAttachments(
  projectId: string
): Promise<{
  attachments: ProjectAttachment[];
  role: 'supplier' | 'customer';
  currentUserId: string;
}> {
  const res = await fetch(`/api/projects/${projectId}/attachments`);
  const json = (await res.json()) as {
    attachments?: ProjectAttachment[];
    role?: 'supplier' | 'customer';
    currentUserId?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? 'Kunne ikke hente vedlegg');
  }
  return {
    attachments: json.attachments ?? [],
    role: json.role ?? 'supplier',
    currentUserId: json.currentUserId ?? '',
  };
}

export async function uploadProjectAttachment(
  projectId: string,
  input: {
    file: File;
    fileName?: string;
    description?: string;
    visibleToCustomer?: boolean;
    linkedDocumentId?: string | null;
  }
): Promise<ProjectAttachment> {
  if (input.file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Filen er for stor (maks ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB)`);
  }

  const formData = new FormData();
  formData.append('file', input.file);
  if (input.fileName?.trim()) formData.append('fileName', input.fileName.trim());
  if (input.description?.trim()) formData.append('description', input.description.trim());
  if (input.visibleToCustomer) formData.append('visibleToCustomer', 'true');
  if (input.linkedDocumentId) formData.append('linkedDocumentId', input.linkedDocumentId);

  const res = await fetch(`/api/projects/${projectId}/attachments`, {
    method: 'POST',
    body: formData,
  });
  const json = (await res.json()) as { attachment?: ProjectAttachment; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Opplasting feilet (${res.status})`);
  }
  if (!json.attachment) {
    throw new Error('Opplasting feilet — ingen vedlegg returnert');
  }
  return json.attachment;
}

export async function patchProjectAttachment(
  projectId: string,
  id: string,
  patch: {
    description?: string | null;
    visibleToCustomer?: boolean;
    linkedDocumentId?: string | null;
  }
): Promise<ProjectAttachment> {
  const res = await fetch(`/api/projects/${projectId}/attachments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as { attachment?: ProjectAttachment; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Oppdatering feilet');
  if (!json.attachment) throw new Error('Oppdatering feilet');
  return json.attachment;
}

export async function deleteProjectAttachment(
  projectId: string,
  id: string
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/attachments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? 'Sletting feilet');
  }
}

export function attachmentDownloadUrl(projectId: string, id: string, signed = false): string {
  const base = `/api/projects/${projectId}/attachments/${id}/download`;
  return signed ? `${base}?signed=1` : base;
}

export async function downloadProjectAttachment(
  projectId: string,
  attachment: ProjectAttachment
): Promise<void> {
  const res = await fetch(attachmentDownloadUrl(projectId, attachment.id));
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? 'Nedlasting feilet');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAttachmentBlob(
  projectId: string,
  id: string
): Promise<Blob> {
  const res = await fetch(attachmentDownloadUrl(projectId, id));
  if (!res.ok) {
    throw new Error('Kunne ikke hente vedlegg');
  }
  return res.blob();
}
