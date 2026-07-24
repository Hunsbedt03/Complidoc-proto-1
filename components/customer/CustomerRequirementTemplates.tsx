'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCustomerRequirementTemplate,
  deactivateCustomerRequirementTemplate,
  fetchCustomerRequirementTemplates,
} from '@/lib/requirements/client';
import type {
  CustomerRequirementTemplate,
  DocumentOption,
} from '@/lib/requirements/types';

export function CustomerRequirementTemplates() {
  const [templates, setTemplates] = useState<CustomerRequirementTemplate[]>([]);
  const [documentOptions, setDocumentOptions] = useState<DocumentOption[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [kravBeskrivelse, setKravBeskrivelse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCustomerRequirementTemplates();
      setTemplates(data.templates);
      setDocumentOptions(data.documentOptions);
      setDocumentId((current) => {
        if (current && data.documentOptions.some((o) => o.id === current)) {
          return current;
        }
        const used = new Set(data.templates.map((t) => t.documentId));
        return data.documentOptions.find((o) => !used.has(o.id))?.id ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste kravmaler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const existingIds = useMemo(
    () => new Set(templates.map((t) => t.documentId)),
    [templates]
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
      await addCustomerRequirementTemplate({
        documentId,
        kravBeskrivelse: kravBeskrivelse.trim() || undefined,
      });
      setKravBeskrivelse('');
      setMessage('Krav lagt til i malen.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke legge til krav');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Fjerne dette kravet fra malen?')) return;
    setError('');
    setMessage('');
    try {
      await deactivateCustomerRequirementTemplate(id);
      setMessage('Krav fjernet.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke fjerne krav');
    }
  }

  return (
    <div className="req-templates">
      <section className="customer-access-panel">
        <h3 className="customer-access-title">Aktiv kravmal</h3>
        <p className="customer-access-lead">
          Dokumenter du forventer i alle prosjekt der organisasjonen har tilgang.
          Leverandøren ser disse som kundekrav i prosjektets sjekkliste.
        </p>

        {loading ? (
          <p className="customer-access-empty">Laster…</p>
        ) : templates.length === 0 ? (
          <p className="customer-access-empty">Ingen krav i malen ennå.</p>
        ) : (
          <ul className="req-checklist">
            {templates.map((t) => (
              <li key={t.id} className="req-checklist-row req-checklist-row--actions">
                <div className="req-checklist-main">
                  <span className="req-checklist-label">{t.label}</span>
                  {t.kravBeskrivelse ? (
                    <span className="req-checklist-meta">{t.kravBeskrivelse}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn-dl customer-access-revoke"
                  onClick={() => void handleRemove(t.id)}
                >
                  Fjern
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="req-add-form" onSubmit={(e) => void handleAdd(e)}>
          <h4 className="req-section-label">Legg til dokumentkrav</h4>
          <div className="req-add-row">
            <select
              className="form-input"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              disabled={availableOptions.length === 0}
              required
            >
              {availableOptions.length === 0 ? (
                <option value="">Alle dokumenttyper er allerede i malen</option>
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
              placeholder="Beskrivelse (valgfritt)"
              value={kravBeskrivelse}
              onChange={(e) => setKravBeskrivelse(e.target.value)}
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

        {message ? <p className="form-info">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </div>
  );
}
