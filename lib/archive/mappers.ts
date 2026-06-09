import type { ISOCertification } from '@/lib/documents/types';
import type { ArchiveCategory, ArchiveDocument } from './types';
import { documentCategoryToArchive } from './types';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';

export type DbArchiveRow = {
  id: string;
  company_id: string;
  document_type_id: string;
  label: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  version: string | null;
  valid_from: string | null;
  valid_until: string | null;
  iso_certifications: string[] | null;
  uploaded_by: string | null;
  uploaded_at: string;
  last_reviewed_at: string | null;
  review_interval_months: number | null;
  tags: string[] | null;
  notes: string | null;
  is_active: boolean;
  superseded_by: string | null;
};

export function mapDbToArchiveDocument(row: DbArchiveRow): ArchiveDocument {
  return {
    id: row.id,
    companyId: row.company_id,
    documentTypeId: row.document_type_id,
    label: row.label,
    category: row.category as ArchiveCategory,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size ?? 0,
    mimeType: row.mime_type ?? 'application/pdf',
    version: row.version ?? 'v1',
    validFrom: row.valid_from ?? undefined,
    validUntil: row.valid_until ?? undefined,
    isoCertifications: (row.iso_certifications ?? []) as ISOCertification[],
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedAt: row.uploaded_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    reviewIntervalMonths: row.review_interval_months ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    isActive: row.is_active,
    supersededBy: row.superseded_by ?? undefined,
  };
}

export function defaultArchiveCategory(documentTypeId: string): ArchiveCategory {
  const doc = getCatalogDocument(documentTypeId as DocumentId);
  if (!doc) return 'other';
  return documentCategoryToArchive(doc.category);
}

export function defaultArchiveLabel(documentTypeId: string): string {
  return getCatalogDocument(documentTypeId as DocumentId)?.label ?? documentTypeId;
}

export function defaultIsoCerts(documentTypeId: string): ISOCertification[] {
  const doc = getCatalogDocument(documentTypeId as DocumentId);
  return (doc?.isoScope ?? []).filter((c) => c !== 'none') as ISOCertification[];
}
