'use client';

import { useMemo, useRef, useState } from 'react';
import { getArchiveEligibleDocuments } from '@/lib/archive/eligible';
import { ISO_CERTIFICATION_OPTIONS } from '@/lib/documents/types';
import {
  defaultArchiveLabel,
  defaultIsoCerts,
} from '@/lib/archive/mappers';
import { normalizeArchiveTypeId } from '@/lib/archive/normalize';
import type { ArchiveDocument } from '@/lib/archive/types';
import {
  getLocalCompanyId,
  listLocalArchiveDocuments,
  saveLocalArchiveDocument,
} from '@/lib/localArchive';
import { useAuth } from '@/components/providers/AuthProvider';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: ArchiveDocument) => void;
  presetDocumentTypeId?: string;
  replaceExisting?: ArchiveDocument;
  companyProfileId?: string | null;
};

export function ArchiveUploadDialog({
  open,
  onClose,
  onSaved,
  presetDocumentTypeId,
  replaceExisting,
  companyProfileId,
}: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const eligible = useMemo(() => getArchiveEligibleDocuments(), []);

  const [documentTypeId, setDocumentTypeId] = useState(
    presetDocumentTypeId ?? eligible[0]?.id ?? ''
  );
  const [version, setVersion] = useState(replaceExisting?.version ?? 'v1');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [reviewMonths, setReviewMonths] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [label, setLabel] = useState(
    replaceExisting?.label ?? defaultArchiveLabel(presetDocumentTypeId ?? '')
  );
  const [isoCerts, setIsoCerts] = useState<string[]>(
    replaceExisting?.isoCertifications ??
      defaultIsoCerts(presetDocumentTypeId ?? '')
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Velg en fil');
      return;
    }
    if (!documentTypeId) {
      setError('Velg dokumenttype');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const body = {
        documentTypeId,
        label: label || defaultArchiveLabel(documentTypeId),
        version,
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
        isoCertifications: isoCerts,
        reviewIntervalMonths: reviewMonths ? Number(reviewMonths) : undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes: notes || undefined,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size,
        fileBase64: base64,
        replaceExistingId: replaceExisting?.id,
      };

      const res = await fetch('/api/archive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as {
        document?: ArchiveDocument;
        storage?: string;
        error?: string;
      };

      if (json.document) {
        onSaved(json.document);
        onClose();
        return;
      }

      if (json.storage === 'local' || !res.ok) {
        const companyId =
          companyProfileId ?? (user ? getLocalCompanyId(user.id) : 'local');
        const doc = saveLocalArchiveDocument(companyId, {
          ...body,
          uploadedBy: user?.id,
        });
        onSaved(doc);
        onClose();
        return;
      }

      setError(json.error ?? 'Opplasting feilet');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opplasting feilet');
    } finally {
      setUploading(false);
    }
  }

  function toggleIso(value: string) {
    setIsoCerts((prev) =>
      prev.includes(value as (typeof isoCerts)[number])
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  }

  return (
    <div className="lock-dialog-backdrop" onClick={onClose}>
      <div
        className="lock-dialog archive-upload-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{replaceExisting ? 'Ny versjon' : 'Last opp til arkiv'}</h3>
        <p className="lock-dialog-lead">
          Dokumentet lagres på bedriftsnivå og kobles automatisk til nye prosjekter.
        </p>

        <div className="archive-upload-form">
          <label className="form-label">Dokumenttype</label>
          <select
            className="form-input"
            value={documentTypeId}
            disabled={!!presetDocumentTypeId}
            onChange={(e) => {
              setDocumentTypeId(e.target.value);
              setLabel(defaultArchiveLabel(e.target.value));
              setIsoCerts(defaultIsoCerts(e.target.value));
            }}
          >
            {eligible.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          <label className="form-label">Visningsnavn</label>
          <input
            className="form-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <label className="form-label">Versjon</label>
          <input
            className="form-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="f.eks. v2.1 eller Rev. 3"
          />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gyldig fra</label>
              <input
                type="date"
                className="form-input"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gyldig til</label>
              <input
                type="date"
                className="form-input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <label className="form-label">Revurder etter (måneder)</label>
          <input
            className="form-input"
            type="number"
            min={1}
            value={reviewMonths}
            onChange={(e) => setReviewMonths(e.target.value)}
            placeholder="f.eks. 12"
          />

          <label className="form-label">ISO-sertifiseringer</label>
          <div className="cert-multiselect">
            {ISO_CERTIFICATION_OPTIONS.filter((o) => o.value !== 'none').map(
              (opt) => (
                <label key={opt.value} className="cert-multiselect-option">
                  <input
                    type="checkbox"
                    checked={isoCerts.includes(opt.value)}
                    onChange={() => toggleIso(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              )
            )}
          </div>

          <label className="form-label">Tagger (kommaseparert)</label>
          <input
            className="form-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="kvalitet, intern, godkjent"
          />

          <label className="form-label">Notater (internt)</label>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label className="form-label">Fil (PDF, DOCX)</label>
          <input
            ref={fileRef}
            type="file"
            className="form-input"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </div>

        {error ? <p className="upload-slot-alert">{error}</p> : null}

        <div className="lock-dialog-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Avbryt
          </button>
          <button
            type="button"
            className="btn-generate"
            disabled={uploading}
            onClick={() => void handleSubmit()}
          >
            {uploading ? 'Laster opp…' : 'Lagre i arkiv'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hjelper for å sjekke lokalt arkiv uten API */
export function mergeLocalArchiveList(
  companyId: string,
  cloudDocs: ArchiveDocument[]
): ArchiveDocument[] {
  const local = listLocalArchiveDocuments(companyId);
  const byType = new Map<string, ArchiveDocument>();
  for (const doc of [...cloudDocs, ...local]) {
    if (!doc.isActive) continue;
    const key = normalizeArchiveTypeId(doc.documentTypeId);
    const prev = byType.get(key);
    if (
      !prev ||
      new Date(doc.uploadedAt).getTime() > new Date(prev.uploadedAt).getTime()
    ) {
      byType.set(key, doc);
    }
  }
  return [...byType.values()];
}
