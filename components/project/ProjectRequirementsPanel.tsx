'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addSupplierRequirement,
  fetchProjectRequirements,
  reviewRequirementSuggestion,
} from '@/lib/requirements/client';
import type {
  ChecklistRequirementItem,
  DocumentOption,
  PendingSuggestion,
} from '@/lib/requirements/types';

type Props = {
  projectId: string;
};

function kildeLabel(kilde: ChecklistRequirementItem['kilde']): string {
  if (kilde === 'kunde') return 'Kunde';
  if (kilde === 'leverandor') return 'Leverandør';
  return 'Forslag';
}

export function ProjectRequirementsPanel({ projectId }: Props) {
  const [checklist, setChecklist] = useState<ChecklistRequirementItem[]>([]);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [documentOptions, setDocumentOptions] = useState<DocumentOption[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [begrunnelse, setBegrunnelse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProjectRequirements(projectId);
      setChecklist(data.checklist);
      setSuggestions(data.suggestions);
      setDocumentOptions(data.documentOptions);
      setDocumentId((current) => {
        if (current && data.documentOptions.some((o) => o.id === current)) {
          return current;
        }
        const used = new Set(data.checklist.map((item) => item.documentId));
        return data.documentOptions.find((o) => !used.has(o.id))?.id ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste dokumentkrav');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const existingIds = useMemo(
    () => new Set(checklist.map((item) => item.documentId)),
    [checklist]
  );

  const availableOptions = useMemo(
    () => documentOptions.filter((opt) => !existingIds.has(opt.id)),
    [documentOptions, existingIds]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!documentId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await addSupplierRequirement(projectId, {
        documentId,
        begrunnelse: begrunnelse.trim() || undefined,
      });
      setBegrunnelse('');
      setMessage('Krav lagt til.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke legge til krav');
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id: string, status: 'godkjent' | 'avvist') {
    setReviewingId(id);
    setError('');
    setMessage('');
    try {
      await reviewRequirementSuggestion(projectId, id, status);
      setMessage(status === 'godkjent' ? 'Forslag godkjent.' : 'Forslag avvist.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere forslag');
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <section className="customer-access-panel req-panel">
      <h3 className="customer-access-title">Dokumentkrav</h3>
      <p className="customer-access-lead">
        Sjekkliste for dokumenter som kreves på prosjektet — fra kundens mal, egne krav
        og systemforslag.
      </p>

      {loading ? (
        <p className="customer-access-empty">Laster…</p>
      ) : (
        <>
          {checklist.length === 0 ? (
            <p className="customer-access-empty">Ingen dokumentkrav ennå.</p>
          ) : (
            <ul className="req-checklist">
              {checklist.map((item) => (
                <li key={`${item.kilde}-${item.documentId}`} className="req-checklist-row">
                  <div className="req-checklist-main">
                    <span className="req-checklist-label">{item.label}</span>
                    <span className="req-checklist-meta">
                      {kildeLabel(item.kilde)}
                      {item.detaljer ? ` · ${item.detaljer}` : ''}
                    </span>
                  </div>
                  <span
                    className={
                      'req-presence' + (item.present ? ' req-presence--ok' : ' req-presence--missing')
                    }
                  >
                    {item.present ? 'Til stede' : 'Mangler'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 ? (
            <div className="req-suggestions">
              <h4 className="req-section-label">Forslag å vurdere</h4>
              <ul className="req-checklist">
                {suggestions.map((s) => (
                  <li key={s.id} className="req-checklist-row req-checklist-row--actions">
                    <div className="req-checklist-main">
                      <span className="req-checklist-label">{s.label}</span>
                      {s.kildeRegel ? (
                        <span className="req-checklist-meta">{s.kildeRegel}</span>
                      ) : null}
                    </div>
                    <div className="req-suggestion-actions">
                      <button
                        type="button"
                        className="btn-dl"
                        disabled={reviewingId === s.id}
                        onClick={() => void handleReview(s.id, 'godkjent')}
                      >
                        Godkjenn
                      </button>
                      <button
                        type="button"
                        className="btn-dl"
                        disabled={reviewingId === s.id}
                        onClick={() => void handleReview(s.id, 'avvist')}
                      >
                        Avvis
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form className="req-add-form" onSubmit={(e) => void handleAdd(e)}>
            <h4 className="req-section-label">Legg til leverandørkrav</h4>
            <div className="req-add-row">
              <select
                className="form-input"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                disabled={availableOptions.length === 0}
                required
              >
                {availableOptions.length === 0 ? (
                  <option value="">Alle dokumenttyper er allerede i listen</option>
                ) : (
                  availableOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Begrunnelse (valgfritt)"
                value={begrunnelse}
                onChange={(e) => setBegrunnelse(e.target.value)}
              />
              <button
                type="submit"
                className="btn-dl"
                disabled={saving || availableOptions.length === 0}
              >
                {saving ? 'Lagrer…' : '+ Legg til'}
              </button>
            </div>
          </form>
        </>
      )}

      {message ? <p className="form-info">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
