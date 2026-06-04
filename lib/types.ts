import type { DocumentId } from './documents/ids';

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
};

export type GeneratedDoc = {
  documentId: DocumentId;
  /** API docType (legacy risk|tech eller kanonisk id). */
  docType: string;
  filename: string;
  docx: string;
  label?: string;
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
  status: string;
  created_at: string;
  zip_filename: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type SaveProjectPayload = ProjectFormData & {
  machineData: string;
  zipFilename: string;
  zipBase64: string;
  documents: GeneratedDoc[];
};
