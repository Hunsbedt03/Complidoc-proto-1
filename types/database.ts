/** Supabase-rad for document_revisions (snake_case). */
export type DbDocumentRevision = {
  id: string;
  project_id: string;
  document_id: string;
  revision: number;
  content: string;
  content_json: unknown | null;
  change_type: string;
  change_note: string;
  changed_by: string | null;
  changed_by_name: string;
  changed_at: string;
  source: string;
};

export interface CustomerOrganization {
  id: string;
  name: string;
  email_domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerUser {
  id: string;
  auth_user_id: string | null;
  customer_organization_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

export interface CustomerProjectAccess {
  id: string;
  project_id: string;
  invited_email: string;
  customer_organization_id: string | null;
  customer_user_id: string | null;
  status: 'pending' | 'active' | 'revoked';
  invited_by: string | null;
  invited_at: string;
  activated_at: string | null;
}

export interface ProjectRevisionCycle {
  id: string;
  project_id: string;
  cycle_number: number;
  status: 'open' | 'locked' | 'fully_signed' | 'superseded';
  supplier_locked_at: string | null;
  supplier_signed_by: string | null;
  supplier_signed_by_name: string | null;
  supplier_signed_at: string | null;
  customer_signed_by: string | null;
  customer_signed_by_name: string | null;
  customer_signed_at: string | null;
  supplier_signature_method: 'simple' | 'bankid';
  customer_signature_method: 'simple' | 'bankid';
  supplier_signature_metadata: Record<string, unknown> | null;
  customer_signature_metadata: Record<string, unknown> | null;
  reopened_reason: string | null;
  reopened_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotification {
  id: string;
  customer_user_id: string | null;
  customer_organization_id: string;
  project_id: string;
  revision_cycle_id: string | null;
  type: 'package_ready_for_review' | 'revision_opened' | 'revision_ready_for_review';
  read_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export type {
  DocumentRevision,
  RevisionChangeType,
  RevisionSource,
} from '@/lib/revisions';
