'use client';

import { openArchiveDocument } from '@/lib/archive/openDocument';
import type { UploadRequirement } from '@/lib/documents/uploadRequirements';
import type { ProjectArchiveLink } from '@/lib/types';
import { DocumentUploadSlot } from '@/components/DocumentUploadSlot';
import type { UploadSlot } from '@/lib/types';

type Props = {
  requirement: UploadRequirement;
  projectId: string;
  archiveLink?: ProjectArchiveLink;
  slot?: UploadSlot;
  onUploadComplete: (slot: UploadSlot) => void;
  onUploadToArchive: (documentTypeId: string) => void;
  onReplaceArchive: (documentTypeId: string) => void;
  disabled?: boolean;
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO');
}

export function ArchiveDocumentSlot({
  requirement,
  projectId,
  archiveLink,
  slot,
  onUploadComplete,
  onUploadToArchive,
  onReplaceArchive,
  disabled = false,
}: Props) {
  const projectOverride =
    slot?.status === 'uploaded' && slot.fromArchive !== true && !!slot.fileName;
  const showFromArchive = !!archiveLink && !projectOverride;

  if (showFromArchive) {
    return (
      <div className="upload-slot upload-slot--archive">
        <div className="upload-slot-head">
          <span className="upload-slot-title">📁 {requirement.label}</span>
          <span className="upload-slot-req upload-slot-req--archive">Fra arkiv</span>
        </div>
        <p className="upload-slot-desc">{requirement.description}</p>
        <div className="upload-slot-archive-info">
          <span className="upload-slot-archive-icon">✓</span>
          <div>
            <p className="upload-slot-archive-label">
              {archiveLink.label ?? requirement.label}
            </p>
            <p className="upload-slot-archive-meta">
              Fra bedriftsarkivet · {archiveLink.version ?? 'v1'} · Lastet opp{' '}
              {formatDate(archiveLink.uploadedAt)}
            </p>
          </div>
        </div>
        <div className="upload-slot-actions">
          <button
            type="button"
            className="btn-dl"
            disabled={disabled}
            onClick={() => {
              if (archiveLink.archiveDocumentId) {
                void openArchiveDocument(
                  archiveLink.archiveDocumentId,
                  undefined,
                  undefined,
                  archiveLink.fileName,
                  archiveLink.label
                );
              }
            }}
          >
            Vis
          </button>
          {!disabled ? (
            <button
              type="button"
              className="btn-cancel upload-slot-replace"
              onClick={() => onReplaceArchive(requirement.id)}
            >
              Erstatt
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!archiveLink && !projectOverride) {
    return (
      <div className="upload-slot upload-slot--archive-missing">
        <div className="upload-slot-head">
          <span className="upload-slot-title">⚠️ {requirement.label}</span>
          <span className="upload-slot-req">Mangler i arkiv</span>
        </div>
        <p className="upload-slot-desc">{requirement.description}</p>
        <p className="upload-slot-reason upload-slot-reason--warn">
          Ikke funnet i bedriftsarkivet — last opp én gang for å gjenbruke i alle
          prosjekter.
        </p>
        {requirement.requiredContent?.length ? (
          <div className="upload-slot-required-content">
            <p className="upload-slot-required-title">Må inneholde:</p>
            <ul className="upload-slot-required-list">
              {requirement.requiredContent.map((item) => (
                <li key={item} className="upload-slot-required-item">
                  <span className="upload-slot-required-check">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!disabled ? (
          <div className="upload-slot-actions">
            <button
              type="button"
              className="btn-generate"
              onClick={() => onUploadToArchive(requirement.id)}
            >
              Last opp til arkiv
            </button>
          </div>
        ) : null}
        <DocumentUploadSlot
          requirement={requirement}
          projectId={projectId}
          slot={slot}
          onUploadComplete={onUploadComplete}
          disabled={disabled}
          compact
        />
      </div>
    );
  }

  return (
    <DocumentUploadSlot
      requirement={requirement}
      projectId={projectId}
      slot={slot}
      onUploadComplete={onUploadComplete}
      disabled={disabled}
    />
  );
}
