'use client';

import { useMemo, useState } from 'react';
import { CompletenessIndicator } from '@/components/CompletenessIndicator';
import { DocumentSearch } from '@/components/DocumentSearch';
import { ArchiveDocumentSlot } from '@/components/archive/ArchiveDocumentSlot';
import { ArchiveUploadDialog } from '@/components/archive/ArchiveUploadDialog';
import type { ArchiveDocument } from '@/lib/archive/types';
import { DocumentUploadSlot } from '@/components/DocumentUploadSlot';
import { isArchiveEligibleId } from '@/lib/archive/eligible';
import { getDocumentsBySource } from '@/lib/documents/catalog';
import { catalogToUploadRequirement } from '@/lib/documents/requirements';
import { SOURCE_CONFIG } from '@/lib/documents/source';
import { projectInputFromForm } from '@/lib/projectInput';
import { usePackageCompleteness } from '@/lib/usePackageCompleteness';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import type { ProjectStatus } from '@/lib/projectStatus';
import type {
  GeneratedDoc,
  ProjectArchiveLink,
  ProjectFormData,
  UploadSlot,
} from '@/lib/types';

const STATUS_ICON: Record<string, string> = {
  complete: '✅',
  generating: '⏳',
  missing: '⏳',
  uploaded: '✅',
  template_ready: '🔀',
};

type Props = {
  form: ProjectFormData;
  generatedDocuments: GeneratedDoc[];
  uploads: UploadSlot[];
  archiveLinks?: ProjectArchiveLink[];
  projectId: string | null;
  projectStatus: ProjectStatus;
  onUploadChange: (slot: UploadSlot) => void;
  onAddDocument?: (documentId: DocumentId) => void;
  onArchiveLinksChange?: (links: ProjectArchiveLink[]) => void;
  generating?: boolean;
};

export function ProjectPackageOverview({
  form,
  generatedDocuments,
  uploads,
  archiveLinks = [],
  projectId,
  projectStatus,
  onUploadChange,
  onAddDocument,
  onArchiveLinksChange,
  generating = false,
}: Props) {
  const [archiveUploadType, setArchiveUploadType] = useState<string | null>(
    null
  );

  const completeness = usePackageCompleteness(
    form,
    generatedDocuments,
    uploads,
    generating,
    archiveLinks
  );

  const projectInput = useMemo(() => projectInputFromForm(form), [form]);
  const uploadRequirements = completeness.uploadRequirements;

  const archiveLinkByType = useMemo(
    () =>
      new Map(
        archiveLinks.map((l) => [l.documentTypeId.trim().toLowerCase(), l])
      ),
    [archiveLinks]
  );

  const selectedHybrid = useMemo(() => {
    const raw = form.selectedDocuments ?? [];
    return raw.filter((id) => getCatalogDocument(id)?.sourceType === 'hybrid');
  }, [form.selectedDocuments]);

  const hybridDocs = useMemo(
    () =>
      getDocumentsBySource('hybrid', projectInput).filter(
        (d) => selectedHybrid.includes(d.id) || d.required
      ),
    [projectInput, selectedHybrid]
  );

  const uploadsDisabled = projectStatus === 'locked' || !projectId;

  function slotFor(id: string): UploadSlot | undefined {
    return uploads.find((u) => u.documentId === id);
  }

  function handleArchiveSaved(doc: ArchiveDocument) {
    if (!projectId) return;
    const link: ProjectArchiveLink = {
      projectId,
      archiveDocumentId: doc.id,
      documentTypeId: doc.documentTypeId,
      linkStatus: 'confirmed',
      linkedAt: new Date().toISOString(),
      label: doc.label,
      version: doc.version,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    };
    const next = [
      ...archiveLinks.filter((l) => l.documentTypeId !== doc.documentTypeId),
      link,
    ];
    onArchiveLinksChange?.(next);
    onUploadChange({
      documentId: doc.documentTypeId,
      status: 'uploaded',
      fromArchive: true,
      archiveDocumentId: doc.id,
      archiveVersion: doc.version,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    });
    setArchiveUploadType(null);
  }

  const cfg = SOURCE_CONFIG.user_upload;

  return (
    <div className="package-overview">
      <CompletenessIndicator
        completeness={completeness}
        projectStatus={projectStatus}
        generating={generating}
      />

      <ul className="package-status-list">
        {completeness.items.map((item) => (
          <li key={item.documentId} className="package-status-row">
            <span className="package-status-icon">
              {STATUS_ICON[item.status] ?? '·'}
            </span>
            <span className="package-status-label">{item.label}</span>
            <span className="package-status-detail">{item.detail}</span>
          </li>
        ))}
      </ul>

      {uploadRequirements.length > 0 ? (
        <section className="doc-source-section package-upload-dynamic">
          <div className="doc-source-header">
            <span className={`doc-source-badge ${cfg.badgeClass}`}>
              {cfg.icon} Dokumenter du må laste opp
            </span>
            <p className="doc-source-desc">
              Bedriftsdokumenter hentes fra arkivet. Maskinspesifikke filer lastes
              opp per prosjekt.
            </p>
          </div>
          {!projectId ? (
            <p className="form-info">Lagrer prosjekt-ID… last opp etter at siden er klar.</p>
          ) : uploadsDisabled ? (
            <p className="form-info">Prosjektet er låst — opplastinger kan ikke endres.</p>
          ) : (
            <div className="upload-slot-grid">
              {uploadRequirements.map((req) =>
                isArchiveEligibleId(req.id) ? (
                  <ArchiveDocumentSlot
                    key={req.id}
                    requirement={req}
                    projectId={projectId}
                    archiveLink={archiveLinkByType.get(req.id.trim().toLowerCase())}
                    slot={slotFor(req.id)}
                    onUploadComplete={onUploadChange}
                    onUploadToArchive={(typeId) => setArchiveUploadType(typeId)}
                    onReplaceArchive={(typeId) => setArchiveUploadType(typeId)}
                    disabled={uploadsDisabled}
                  />
                ) : (
                  <DocumentUploadSlot
                    key={req.id}
                    requirement={req}
                    projectId={projectId}
                    slot={slotFor(req.id)}
                    onUploadComplete={onUploadChange}
                    disabled={uploadsDisabled}
                  />
                )
              )}
            </div>
          )}
        </section>
      ) : null}

      {hybridDocs.length > 0 && !uploadsDisabled && projectId ? (
        <section className="doc-source-section">
          <div className="doc-source-header">
            <span className={`doc-source-badge ${SOURCE_CONFIG.hybrid.badgeClass}`}>
              {SOURCE_CONFIG.hybrid.icon} {SOURCE_CONFIG.hybrid.label}
            </span>
            <p className="doc-source-desc">{SOURCE_CONFIG.hybrid.description}</p>
          </div>
          <div className="upload-slot-grid">
            {hybridDocs.map((doc) => {
              const req = catalogToUploadRequirement({
                ...doc,
                reason: doc.reason ?? 'Hybrid mal — last opp signert/ferdig versjon',
              });
              return (
                <DocumentUploadSlot
                  key={doc.id}
                  requirement={req}
                  projectId={projectId}
                  slot={slotFor(doc.id)}
                  onUploadComplete={onUploadChange}
                  disabled={uploadsDisabled}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {onAddDocument ? (
        <DocumentSearch
          form={form}
          onAdd={onAddDocument}
          disabled={uploadsDisabled}
        />
      ) : null}

      <ArchiveUploadDialog
        open={!!archiveUploadType}
        onClose={() => setArchiveUploadType(null)}
        onSaved={handleArchiveSaved}
        presetDocumentTypeId={archiveUploadType ?? undefined}
      />
    </div>
  );
}
