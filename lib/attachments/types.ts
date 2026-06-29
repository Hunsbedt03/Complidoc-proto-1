export type AttachmentUploaderRole = 'supplier' | 'customer';

export type ProjectAttachment = {
  id: string;
  projectId: string;
  filePath: string;
  fileName: string;
  description: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: string;
  uploaderRole: AttachmentUploaderRole;
  visibleToCustomer: boolean;
  linkedDocumentId: string | null;
  createdAt: string;
};

export type ProjectAttachmentRow = {
  id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploader_role: AttachmentUploaderRole;
  visible_to_customer: boolean;
  linked_document_id: string | null;
  created_at: string;
};
