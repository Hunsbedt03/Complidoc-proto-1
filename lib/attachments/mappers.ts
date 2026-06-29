import type { ProjectAttachment, ProjectAttachmentRow } from '@/lib/attachments/types';

export function mapAttachmentRow(row: ProjectAttachmentRow): ProjectAttachment {
  return {
    id: row.id,
    projectId: row.project_id,
    filePath: row.file_path,
    fileName: row.file_name,
    description: row.description,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedBy: row.uploaded_by,
    uploaderRole: row.uploader_role,
    visibleToCustomer: row.visible_to_customer,
    linkedDocumentId: row.linked_document_id,
    createdAt: row.created_at,
  };
}

export function sanitizeStorageFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildAttachmentStoragePath(projectId: string, fileName: string): string {
  return `${projectId}/attachments/${Date.now()}_${sanitizeStorageFileName(fileName)}`;
}
