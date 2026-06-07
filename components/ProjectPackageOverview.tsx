'use client';

import { useMemo } from 'react';
import { CompletenessIndicator } from '@/components/CompletenessIndicator';
import { DocumentUploadSlot } from '@/components/DocumentUploadSlot';
import { getDocumentsBySource } from '@/lib/documents/catalog';
import { deriveUploadRequirements } from '@/lib/documents/uploadRequirements';
import { SOURCE_CONFIG } from '@/lib/documents/source';
import { projectInputFromForm } from '@/lib/projectInput';
import { usePackageCompleteness } from '@/lib/usePackageCompleteness';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { ProjectStatus } from '@/lib/projectStatus';
import type {
  GeneratedDoc,
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
  projectId: string | null;
  projectStatus: ProjectStatus;
  onUploadChange: (slot: UploadSlot) => void;
  generating?: boolean;
};

export function ProjectPackageOverview({
  form,
  generatedDocuments,
  uploads,
  projectId,
  projectStatus,
  onUploadChange,
  generating = false,
}: Props) {
  const completeness = usePackageCompleteness(
    form,
    generatedDocuments,
    uploads,
    generating
  );

  const projectInput = useMemo(() => projectInputFromForm(form), [form]);

  const uploadRequirements = useMemo(
    () => deriveUploadRequirements(projectInput),
    [projectInput]
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
              Kravene er utledet fra maskindata du fylte inn — ikke en fast liste.
            </p>
          </div>
          {!projectId ? (
            <p className="form-info">Lagrer prosjekt-ID… last opp etter at siden er klar.</p>
          ) : uploadsDisabled ? (
            <p className="form-info">Prosjektet er låst — opplastinger kan ikke endres.</p>
          ) : (
            <div className="upload-slot-grid">
              {uploadRequirements.map((req) => (
                <DocumentUploadSlot
                  key={req.id}
                  requirement={req}
                  projectId={projectId}
                  slot={slotFor(req.id)}
                  onUploadComplete={onUploadChange}
                  disabled={uploadsDisabled}
                />
              ))}
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
              const req = {
                id: doc.id,
                label: doc.label,
                description: doc.description,
                directive: doc.directive,
                acceptedFormats: doc.acceptedFormats ?? ['pdf', 'docx'],
                required: doc.required,
                reason: 'Hybrid mal — last opp signert/ferdig versjon',
              };
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
    </div>
  );
}
