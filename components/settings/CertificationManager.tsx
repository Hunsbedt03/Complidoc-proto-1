'use client';

import { useRef, useState } from 'react';
import {
  COMPANY_CERTIFICATION_OPTIONS,
  ISO_LABELS,
  isCertExpiringSoon,
} from '@/lib/companyProfile/extended';
import type { CompanyCertification } from '@/lib/types';

type Props = {
  certifications: CompanyCertification[];
  onChange: (next: CompanyCertification[]) => void;
  disabled?: boolean;
};

const EMPTY_CERT: CompanyCertification = {
  standard: 'iso_9001',
  certBody: '',
  certNumber: '',
  issuedDate: '',
  expiryDate: '',
  scope: '',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO');
}

export function CertificationManager({
  certifications,
  onChange,
  disabled = false,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<CompanyCertification>(EMPTY_CERT);
  const fileRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setEditingIndex(null);
    setDraft({ ...EMPTY_CERT });
    setDialogOpen(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDraft({ ...certifications[index] });
    setDialogOpen(true);
  }

  function remove(index: number) {
    onChange(certifications.filter((_, i) => i !== index));
  }

  function saveDraft() {
    const next = [...certifications];
    if (editingIndex !== null) {
      next[editingIndex] = draft;
    } else {
      const exists = next.findIndex((c) => c.standard === draft.standard);
      if (exists >= 0) next[exists] = draft;
      else next.push(draft);
    }
    onChange(next);
    setDialogOpen(false);
  }

  function handleCertFile(file: File) {
    if (file.type !== 'application/pdf') return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({
        ...d,
        certificateFileUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="cert-manager">
      {certifications.map((cert, index) => (
        <div key={`${cert.standard}-${index}`} className="cert-card">
          <div className="cert-card-body">
            <h4 className="cert-card-title">
              {ISO_LABELS[cert.standard] ?? cert.standard}
            </h4>
            <p className="cert-card-meta">
              {cert.certBody || '—'} · Sertifikatnr: {cert.certNumber || '—'}
            </p>
            <p className="cert-card-meta">
              Utstedt: {formatDate(cert.issuedDate)} · Utløper:{' '}
              {formatDate(cert.expiryDate)}
              {isCertExpiringSoon(cert.expiryDate) ? (
                <span className="cert-card-warn"> ⚠️ Utløper snart</span>
              ) : null}
            </p>
            {cert.scope ? (
              <p className="cert-card-scope">{cert.scope}</p>
            ) : null}
          </div>
          {!disabled ? (
            <div className="cert-card-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => openEdit(index)}
              >
                Rediger
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => remove(index)}
              >
                Fjern
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {!disabled ? (
        <button type="button" className="btn-dl" onClick={openAdd}>
          + Legg til sertifisering
        </button>
      ) : null}

      {dialogOpen ? (
        <div
          className="lock-dialog-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDialogOpen(false)}
          role="presentation"
        >
          <div className="lock-dialog cert-dialog" role="dialog">
            <h3>
              {editingIndex !== null ? 'Rediger' : 'Legg til'} sertifisering
            </h3>
            <div className="form-group">
              <label className="form-label">Standard</label>
              <select
                className="form-input"
                value={draft.standard}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    standard: e.target.value as CompanyCertification['standard'],
                  }))
                }
              >
                {COMPANY_CERTIFICATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sertifiseringsorgan</label>
              <input
                className="form-input"
                placeholder="f.eks. DNV GL, Bureau Veritas"
                value={draft.certBody ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, certBody: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sertifikatnummer</label>
              <input
                className="form-input"
                value={draft.certNumber ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, certNumber: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Omfang</label>
              <input
                className="form-input"
                placeholder="Design og produksjon av industrielle maskiner"
                value={draft.scope ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, scope: e.target.value }))
                }
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Utstedelsesdato</label>
                <input
                  type="date"
                  className="form-input"
                  value={draft.issuedDate ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, issuedDate: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Utløpsdato</label>
                <input
                  type="date"
                  className="form-input"
                  value={draft.expiryDate ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, expiryDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sertifikat (PDF)</label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="form-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCertFile(f);
                }}
              />
              {draft.certificateFileUrl ? (
                <p className="form-card-hint">PDF lastet opp</p>
              ) : null}
            </div>
            <div className="lock-dialog-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDialogOpen(false)}
              >
                Avbryt
              </button>
              <button type="button" className="btn-generate" onClick={saveDraft}>
                Lagre
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
