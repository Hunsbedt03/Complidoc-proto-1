import type { DocumentId } from '@/lib/documents/ids';

export type RequirementKilde = 'kunde' | 'leverandor' | 'forslag';

export type ChecklistRequirementItem = {
  projectId: string;
  kilde: RequirementKilde;
  documentId: string;
  label: string;
  detaljer: string | null;
  present: boolean;
};

export type PendingSuggestion = {
  id: string;
  documentId: string;
  label: string;
  kildeRegel: string | null;
  status: 'foreslatt';
};

export type CustomerRequirementTemplate = {
  id: string;
  documentId: string;
  label: string;
  kravBeskrivelse: string | null;
  aktiv: boolean;
  createdAt: string;
};

export type DocumentOption = {
  id: DocumentId;
  label: string;
};
