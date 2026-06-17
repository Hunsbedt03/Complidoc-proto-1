import type { ArchiveLinkStatus } from './archive/types';
import type { DocumentId } from './documents/ids';
import type { ISOCertification } from './documents/types';
import type { ProjectStatus } from './projectStatus';

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

/** Legacy korte id-er (API / eksisterende prosjekter). */
export type DocType = 'risk' | 'tech' | 'doc' | 'qc';

export type ProjectFormData = {
  prosjekt: string;
  kunde: string;
  produsent: string;
  ingenior: string;
  serienr: string;
  maskin: string;
  beskrivelse: string;
  drivsystem: string;
  styring: string;
  installasjonsmiljo: string;
  tiltenktbruk: string;
  standarder: string;
  marked: string;
  selectedDocuments?: DocumentId[];
  /** Hybrid-dokumenter valgt i prosjektskjemaet (avledes fra selectedDocuments hvis utelatt). */
  selectedHybrid?: DocumentId[];
  certifications?: ISOCertification[];
  addedDocuments?: DocumentId[];
};

export type GeneratedDoc = {
  documentId: DocumentId;
  /** API docType (legacy risk|tech eller kanonisk id). */
  docType: string;
  filename: string;
  docx: string;
  label?: string;
  contentHtml?: string;
  contentJson?: string;
  structuredData?: string;
  language?: 'no' | 'en';
};

export type GeneratedDocumentStatus = {
  id: DocumentId;
  label: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  fileUrl?: string;
  revision: number;
  generatedAt?: string;
  errorMessage?: string;
  filename?: string;
};

export type ZipData = {
  zip: string;
  filename: string;
};

export type ProsjektSummary = {
  id: string;
  navn: string;
  produsent: string | null;
  /** Legacy tekst eller workflow-status */
  status: string;
  workflowStatus?: ProjectStatus;
  completenessPercent?: number;
  created_at: string;
  zip_filename: string | null;
};

export type UserProfile = {
  id: string;
  company_id?: string | null;
  email: string;
  full_name: string | null;
  onboarding_completed?: boolean | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  subscription_period_end?: string | null;
  trial_end?: string | null;
  projects_used_this_month?: number | null;
};

export type CompanyCertificationStandard =
  | ISOCertification
  | 'iso_50001'
  | 'iso_22000';

export type CompanyCertification = {
  standard: CompanyCertificationStandard;
  certBody?: string;
  certNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  scope?: string;
  certificateFileUrl?: string;
};

export type CompanyProfile = {
  companyName: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  responsibleEngineer: string;
  engineerTitle: string;
  phone: string;
  website?: string;
  logoUrl?: string;
  industrySector?: string;
  typicalMachineTypes?: string[];
  typicalInstallationEnv?: string[];
  primaryMarkets?: string[];
  certifications?: CompanyCertification[];
  preferredStandards?: string[];
  defaultResponsibleEngineer?: string;
  defaultMarket?: string;
  defaultInstallationEnv?: string;
  profileCompleteness?: number;
};

export type UploadSlot = {
  documentId: string;
  status: 'missing' | 'uploading' | 'uploaded' | 'error' | 'pending_review';
  fileName?: string;
  uploadedAt?: string;
  fileSize?: number;
  filePath?: string;
  storageRecordId?: string;
  fileBase64?: string;
  mimeType?: string;
  errorMessage?: string;
  /** Hentet fra bedriftsarkiv */
  fromArchive?: boolean;
  archiveDocumentId?: string;
  archiveVersion?: string;
};

export type SaveProjectPayload = ProjectFormData & {
  machineData: string;
  zipFilename: string;
  zipBase64: string;
  documents: GeneratedDoc[];
  uploads?: UploadSlot[];
  workflowStatus?: ProjectStatus;
  completenessPercent?: number;
  localProjectId?: string;
  archiveLinks?: ProjectArchiveLink[];
};
