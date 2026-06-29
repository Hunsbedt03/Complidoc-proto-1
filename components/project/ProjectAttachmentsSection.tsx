'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import {
  attachmentDownloadUrl,
  deleteProjectAttachment,
  downloadProjectAttachment,
  fetchProjectAttachments,
  patchProjectAttachment,
  uploadProjectAttachment,
} from '@/lib/attachments/client';
import { MAX_ATTACHMENT_BYTES } from '@/lib/attachments/constants';
import type { ProjectAttachment } from '@/lib/attachments/types';
import { formatFileSize } from '@/lib/storage/uploadDocument';

type DocumentOption = { id: string; label: string };

type Props = {
  projectId: string;
  role: 'supplier' | 'customer';
  documentOptions?: DocumentOption[];
  readOnly?: boolean;
};

function fileIcon(mime: string | null, fileName: string): string {
  const m = (mime ?? '').toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (m.startsWith('image/')) return '🖼';
  if (m === 'application/pdf' || ext === 'pdf') return '📄';
  if (m.includes('zip') || ext === 'zip') return '📦';
  if (['dwg', 'dxf', 'step', 'stp', 'iges', 'igs'].includes(ext)) return '📐';
  if (m.includes('word') || ext === 'docx') return '📝';
  if (m.includes('sheet') || ext === 'xlsx') return '📊';
  return '📎';
}

function isImageMime(mime: string | null): boolean {
  return (mime ?? '').startsWith('image/');
}

export function ProjectAttachmentsSection({
  projectId,
  role,
  documentOptions = [],
  readOnly = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [visibleToCustomer, setVisibleToCustomer] = useState(false);
  const [linkedDocumentId, setLinkedDocumentId] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const isSupplier = role === 'supplier';
  const canUpload = !readOnly;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { attachments: rows, currentUserId: uid } =
        await fetchProjectAttachments(projectId);
      setAttachments(rows);
      setCurrentUserId(uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste vedlegg');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function pickFile(file: File | null) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`Filen er for stor (maks ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB)`);
      return;
    }
    setPendingFile(file);
    setFileName((prev) => prev.trim() || file.name);
    setError('');
  }

  async function handleUpload() {
    if (!pendingFile) {
      setError('Velg en fil først');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const created = await uploadProjectAttachment(projectId, {
        file: pendingFile,
        fileName: fileName.trim() || pendingFile.name,
        description: description.trim() || undefined,
        visibleToCustomer: isSupplier ? visibleToCustomer : false,
        linkedDocumentId: isSupplier && linkedDocumentId ? linkedDocumentId : null,
      });
      setAttachments((prev) => [created, ...prev]);
      setPendingFile(null);
      setFileName('');
      setDescription('');
      setVisibleToCustomer(false);
      setLinkedDocumentId('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opplasting feilet');
    } finally {
      setUploading(false);
    }
  }

  async function toggleVisible(att: ProjectAttachment) {
    if (!isSupplier) return;
    try {
      const updated = await patchProjectAttachment(projectId, att.id, {
        visibleToCustomer: !att.visibleToCustomer,
      });
      setAttachments((prev) => prev.map((a) => (a.id === att.id ? updated : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere synlighet');
    }
  }

  async function updateLink(att: ProjectAttachment, docId: string) {
    if (!isSupplier) return;
    try {
      const updated = await patchProjectAttachment(projectId, att.id, {
        linkedDocumentId: docId || null,
      });
      setAttachments((prev) => prev.map((a) => (a.id === att.id ? updated : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere kobling');
    }
  }

  async function handleDelete(att: ProjectAttachment) {
    if (!confirm(`Slette «${att.fileName}»?`)) return;
    try {
      await deleteProjectAttachment(projectId, att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sletting feilet');
    }
  }

  return (
    <section className="project-attachments">
      <h2 className="project-attachments-title">Vedlegg</h2>
      <p className="project-attachments-lead">
        {isSupplier
          ? 'Last opp filer til prosjektet. Velg hva kunden skal se, og koble valgfritt til et compliance-dokument i pakken.'
          : 'Last opp filer til leverandøren, eller se vedlegg som er delt med deg.'}
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      {canUpload ? (
        <div
          className={`project-attachments-drop${dragOver ? ' project-attachments-drop--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="project-attachments-file-input"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn-dl"
            onClick={() => fileRef.current?.click()}
          >
            Velg fil
          </button>
          <span className="project-attachments-drop-hint">
            eller dra og slipp — alle filtyper, maks 50 MB
          </span>
          {pendingFile ? (
            <p className="project-attachments-pending">
              Valgt: {pendingFile.name} ({formatFileSize(pendingFile.size)})
            </p>
          ) : null}

          <div className="project-attachments-form-grid">
            <label>
              Navn
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Vist navn i listen"
              />
            </label>
            <label className="project-attachments-form-span">
              Beskrivelse
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hva er dette vedlegget?"
              />
            </label>
            {isSupplier ? (
              <>
                <label>
                  Koble til dokument
                  <select
                    value={linkedDocumentId}
                    onChange={(e) => setLinkedDocumentId(e.target.value)}
                  >
                    <option value="">— Løst vedlegg —</option>
                    {documentOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="project-attachments-checkbox">
                  <input
                    type="checkbox"
                    checked={visibleToCustomer}
                    onChange={(e) => setVisibleToCustomer(e.target.checked)}
                  />
                  Synlig for kunde
                </label>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-generate"
            disabled={uploading || !pendingFile}
            onClick={() => void handleUpload()}
          >
            {uploading ? 'Laster opp…' : 'Last opp vedlegg'}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="form-info">Laster vedlegg…</p>
      ) : attachments.length === 0 ? (
        <p className="form-info">Ingen vedlegg ennå.</p>
      ) : (
        <ul className="project-attachments-list">
          {attachments.map((att) => (
            <li key={att.id} className="project-attachments-item">
              <div className="project-attachments-item-main">
                <span className="project-attachments-icon" aria-hidden>
                  {fileIcon(att.mimeType, att.fileName)}
                </span>
                <div className="project-attachments-item-text">
                  <strong>{att.fileName}</strong>
                  {att.description ? (
                    <p className="project-attachments-desc">{att.description}</p>
                  ) : null}
                  <p className="project-attachments-meta">
                    {att.uploaderRole === 'supplier' ? 'Leverandør' : 'Kunde'} ·{' '}
                    {new Date(att.createdAt).toLocaleString('no-NO')} ·{' '}
                    {formatFileSize(att.fileSize ?? undefined)}
                    {att.linkedDocumentId ? (
                      <>
                        {' '}
                        · Koblet til{' '}
                        {getCatalogDocument(att.linkedDocumentId as DocumentId)?.label ??
                          att.linkedDocumentId}
                      </>
                    ) : null}
                    {isSupplier && att.uploaderRole === 'supplier' ? (
                      <> · {att.visibleToCustomer ? 'Delt med kunde' : 'Skjult for kunde'}</>
                    ) : null}
                  </p>
                </div>
                {isImageMime(att.mimeType) ? (
                  <img
                    className="project-attachments-thumb"
                    src={attachmentDownloadUrl(projectId, att.id)}
                    alt=""
                  />
                ) : null}
              </div>

              <div className="project-attachments-item-actions">
                <button
                  type="button"
                  className="btn-dl"
                  onClick={() => void downloadProjectAttachment(projectId, att)}
                >
                  Last ned
                </button>
                {isSupplier ? (
                  <>
                    {att.uploaderRole === 'supplier' ? (
                      <label className="project-attachments-checkbox project-attachments-checkbox--inline">
                        <input
                          type="checkbox"
                          checked={att.visibleToCustomer}
                          onChange={() => void toggleVisible(att)}
                        />
                        Synlig for kunde
                      </label>
                    ) : null}
                    <select
                      className="project-attachments-link-select"
                      value={att.linkedDocumentId ?? ''}
                      onChange={(e) => void updateLink(att, e.target.value)}
                      aria-label="Koble til dokument"
                    >
                      <option value="">Ingen kobling</option>
                      {documentOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                {canUpload &&
                (isSupplier ||
                  (att.uploaderRole === 'customer' &&
                    att.uploadedBy === currentUserId)) ? (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => void handleDelete(att)}
                  >
                    Slett
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
