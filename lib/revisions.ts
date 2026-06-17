export type RevisionChangeType =
  | 'initial_generation'
  | 'ai_regeneration'
  | 'ai'
  | 'user_edit'
  | 'restore'
  | 'file_upload'
  | 'locked'
  | 'project_created';

export const PROJECT_ACTIVITY_ID = '__project__';

export type RevisionSource =
  | 'ai_generated'
  | 'user_edited'
  | 'ai_regenerated'
  | 'file_upload';

export type DocumentRevision = {
  id: string;
  projectId: string;
  documentId: string;
  revision: number;
  content: string;
  contentJson?: string;
  language?: 'no' | 'en';
  structuredData?: string;
  changeType: RevisionChangeType;
  changeNote: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  source: RevisionSource;
};
