import type { DocumentCategory, ISOCertification } from '@/lib/documents/types';

export type ArchiveCategory =
  | 'quality_management'
  | 'environmental'
  | 'health_safety'
  | 'company_policies'
  | 'procedures'
  | 'certifications'
  | 'supplier_documents'
  | 'training'
  | 'templates'
  | 'legal'
  | 'other';

export type ArchiveLinkStatus = 'auto_linked' | 'confirmed' | 'rejected';

export type ArchiveDocument = {
  id: string;
  companyId: string;
  documentTypeId: string;
  label: string;
  category: ArchiveCategory;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: string;
  validFrom?: string;
  validUntil?: string;
  isoCertifications: ISOCertification[];
  uploadedBy?: string;
  uploadedAt: string;
  lastReviewedAt?: string;
  reviewIntervalMonths?: number;
  tags: string[];
  notes?: string;
  isActive: boolean;
  supersededBy?: string;
};

export type ProjectArchiveLink = {
  id?: string;
  projectId: string;
  archiveDocumentId: string;
  documentTypeId: string;
  linkStatus: ArchiveLinkStatus;
  linkedAt?: string;
  label?: string;
  version?: string;
  fileName?: string;
  uploadedAt?: string;
};

export type AutoLinkResult = {
  documentTypeId: string;
  status: 'auto_linked' | 'missing';
  archiveDocument: ArchiveDocument | null;
  link?: ProjectArchiveLink;
};

export const ARCHIVE_CATEGORY_LABELS: Record<ArchiveCategory, string> = {
  quality_management: 'ISO 9001 — Kvalitetsstyring',
  environmental: 'ISO 14001 — Miljøstyring',
  health_safety: 'ISO 45001 — HMS',
  company_policies: 'Bedriftspolicyer',
  procedures: 'Prosedyrer',
  certifications: 'Sertifikater',
  supplier_documents: 'Leverandørdokumenter',
  training: 'Opplæring og kompetanse',
  templates: 'Maler',
  legal: 'Lovregister og tillatelser',
  other: 'Annet',
};

export const ARCHIVE_FILTER_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'iso_9001', label: 'ISO 9001' },
  { id: 'iso_14001', label: 'ISO 14001' },
  { id: 'iso_45001', label: 'ISO 45001' },
  { id: 'policies', label: 'Policies' },
  { id: 'certifications', label: 'Sertifikater' },
];

export function documentCategoryToArchive(
  category: DocumentCategory
): ArchiveCategory {
  const map: Partial<Record<DocumentCategory, ArchiveCategory>> = {
    quality_management: 'quality_management',
    environmental: 'environmental',
    health_safety: 'health_safety',
    product_compliance: 'legal',
    production_quality: 'procedures',
    conformity: 'certifications',
  };
  return map[category] ?? 'procedures';
}
