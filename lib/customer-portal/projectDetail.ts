import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertCustomerProjectAccess } from '@/lib/customer-portal/access';
import {
  buildCustomerRevisionBanner,
  fetchProjectRevisionCycles,
} from '@/lib/customer-portal/revisionCycles';
import { resolveCustomerDocumentSnapshotCycleId } from '@/lib/customer-portal/projectStatus';
import { loadSnapshotContentsForCycle } from '@/lib/customer-portal/documentSnapshots';
import { markProjectNotificationsRead } from '@/lib/customer-portal/notifications';
import { hydrateDocumentContentsHtml } from '@/lib/revisions/hydrateContents';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { normalizeDocumentId, CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { projectFormFromMachineData } from '@/lib/parseMachineData';
import { computePackageCompleteness } from '@/lib/documents/completeness';
import { projectInputFromForm } from '@/lib/projectInput';
import type { GeneratedDoc, UploadSlot } from '@/lib/types';
import type { CustomerRevisionBanner } from '@/lib/customer-portal/revisionCycles';

export type CustomerProjectDocument = {
  documentId: string;
  label: string;
  filename: string;
  status: 'complete' | 'missing' | 'uploaded';
  contentHtml: string;
};

export type CustomerProjectDetail = {
  id: string;
  name: string;
  supplierName: string;
  form: {
    prosjekt: string;
    kunde: string;
    produsent: string;
    ingenior: string;
    maskintype: string;
    serienummer: string;
  };
  banner: CustomerRevisionBanner;
  documents: CustomerProjectDocument[];
};

async function resolveSupplierName(projectUserId: string, produsent: string | null): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return produsent ?? 'Leverandør';

  const { data: owner } = await admin
    .from('users')
    .select('company_id')
    .eq('id', projectUserId)
    .maybeSingle();

  if (owner?.company_id) {
    const { data: cp } = await admin
      .from('company_profiles')
      .select('company_name')
      .eq('id', owner.company_id)
      .maybeSingle();
    if (cp?.company_name) return cp.company_name;
  }

  const { data: owned } = await admin
    .from('company_profiles')
    .select('company_name')
    .eq('user_id', projectUserId)
    .maybeSingle();

  return owned?.company_name ?? produsent?.trim() ?? 'Leverandør';
}

export async function fetchCustomerProjectDetail(
  authUserId: string,
  projectId: string,
  options?: { markNotificationsRead?: boolean }
): Promise<CustomerProjectDetail> {
  const access = await assertCustomerProjectAccess(authUserId, projectId);

  if (options?.markNotificationsRead !== false) {
    await markProjectNotificationsRead({
      organizationIds: access.organizationIds,
      projectId,
      customerUserId: access.customerUserIds[0],
    });
  }

  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const { data: project, error } = await admin
    .from('prosjekter')
    .select('id, navn, kunde, produsent, ingenior, machine_data, user_id')
    .eq('id', projectId)
    .single();

  if (error || !project) throw new Error('Prosjekt ikke funnet');

  const formData = projectFormFromMachineData(project.machine_data, {
    prosjekt: project.navn,
    kunde: project.kunde,
    produsent: project.produsent,
    ingenior: project.ingenior,
  });

  const { data: docRows } = await admin
    .from('dokumenter')
    .select('doc_type, filename')
    .eq('prosjekt_id', projectId);

  const generatedDocuments: GeneratedDoc[] = (docRows ?? []).map((d) => ({
    documentId: normalizeDocumentId(d.doc_type),
    docType: d.doc_type,
    filename: d.filename,
    docx: '',
  }));

  const { data: uploadRows } = await admin
    .from('uploaded_documents')
    .select('id, document_id, file_name, file_path, file_size, mime_type, uploaded_at')
    .eq('project_id', projectId)
    .eq('is_current', true);

  const uploads: UploadSlot[] = (uploadRows ?? []).map((row) => ({
    documentId: row.document_id,
    status: 'uploaded' as const,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    fileSize: row.file_size ?? undefined,
    filePath: row.file_path,
    storageRecordId: row.id,
    mimeType: row.mime_type ?? undefined,
  }));

  const selectedAi = (formData.selectedDocuments?.length
    ? formData.selectedDocuments
    : CORE_DOCUMENT_IDS
  ).filter((id) => getCatalogDocument(id)?.sourceType === 'ai_generated');
  const selectedHybrid = (formData.selectedDocuments ?? []).filter(
    (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
  );

  const completeness = computePackageCompleteness(
    projectInputFromForm(formData),
    selectedAi,
    selectedHybrid,
    generatedDocuments,
    uploads,
    false,
    []
  );

  const docIds = completeness.items.map((item) => item.documentId);
  const cycles = await fetchProjectRevisionCycles(projectId);
  const snapshotCycleId = resolveCustomerDocumentSnapshotCycleId(cycles);
  const snapshots = snapshotCycleId
    ? await loadSnapshotContentsForCycle(snapshotCycleId)
    : null;

  const contents =
    snapshots === null
      ? await hydrateDocumentContentsHtml(projectId, docIds)
      : {};

  const documents: CustomerProjectDocument[] = completeness.items.map((item) => {
    const snapshot = snapshots?.[item.documentId];
    const isComplete =
      snapshot?.status === 'complete' ||
      item.status === 'complete' ||
      item.status === 'uploaded' ||
      item.status === 'template_ready';
    return {
      documentId: item.documentId,
      label: snapshot?.label ?? item.label,
      filename:
        snapshot?.filename ??
        generatedDocuments.find((d) => d.documentId === item.documentId)?.filename ??
        item.label,
      status: isComplete ? ('complete' as const) : ('missing' as const),
      contentHtml:
        snapshot?.content_html ??
        contents[item.documentId] ??
        `<h2>${item.label}</h2>`,
    };
  });

  const banner = buildCustomerRevisionBanner(cycles);

  return {
    id: project.id,
    name: project.navn,
    supplierName: await resolveSupplierName(project.user_id, project.produsent),
    form: {
      prosjekt: formData.prosjekt,
      kunde: formData.kunde,
      produsent: formData.produsent,
      ingenior: formData.ingenior,
      maskintype: formData.maskin,
      serienummer: formData.serienr,
    },
    banner,
    documents,
  };
}
