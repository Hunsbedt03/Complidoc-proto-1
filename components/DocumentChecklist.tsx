'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DocumentId } from '@/lib/documents/ids';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { getDocumentsBySource } from '@/lib/documents/catalog';
import { estimateTime } from '@/lib/documents/estimates';
import {
  getDefaultSelectedDocuments,
  isDocumentVisibleInChecklist,
} from '@/lib/documents/registry';
import { SOURCE_CONFIG, SOURCE_ORDER } from '@/lib/documents/source';
import { suggestDocuments } from '@/lib/documents/suggest';
import type { ProjectFormData } from '@/lib/types';

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <div className={'check-box' + (checked ? ' on' : '')} aria-hidden>
      {checked ? (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path
            d="M1 3l2 2 4-4"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );
}

type Props = {
  form: ProjectFormData;
  selected: DocumentId[];
  onChange: (ids: DocumentId[]) => void;
};

export function DocumentChecklist({ form, selected, onChange }: Props) {
  const [userTouched, setUserTouched] = useState(false);

  const projectInput = useMemo(
    () => ({
      drivsystem: form.drivsystem,
      installasjonsmiljo: form.installasjonsmiljo,
      marked: form.marked,
      styring: form.styring,
    }),
    [form.drivsystem, form.installasjonsmiljo, form.marked, form.styring]
  );

  useEffect(() => {
    if (userTouched) return;
    onChange(suggestDocuments(projectInput));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-forslag ved feltendring
  }, [projectInput.drivsystem, projectInput.installasjonsmiljo, projectInput.marked, userTouched]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function mergeWithCore(ids: Iterable<DocumentId>): DocumentId[] {
    return [...new Set<DocumentId>([...CORE_DOCUMENT_IDS, ...ids])];
  }

  function toggle(id: DocumentId) {
    setUserTouched(true);
    if (CORE_DOCUMENT_IDS.includes(id)) return;
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(mergeWithCore(next));
  }

  function selectAllGeneratable() {
    setUserTouched(true);
    const ids = new Set<DocumentId>(CORE_DOCUMENT_IDS);
    for (const sourceType of ['ai_generated', 'hybrid'] as const) {
      for (const doc of getDocumentsBySource(sourceType, projectInput)) {
        if (isDocumentVisibleInChecklist(doc.id, projectInput)) {
          ids.add(doc.id);
        }
      }
    }
    onChange([...ids]);
  }

  function resetToSuggested() {
    setUserTouched(false);
    onChange(suggestDocuments(projectInput));
  }

  const generatableSelected = selected.filter(
    (id) =>
      getDocumentsBySource('ai_generated', projectInput).some((d) => d.id === id) ||
      getDocumentsBySource('hybrid', projectInput).some((d) => d.id === id)
  );
  const timeLabel = estimateTime(generatableSelected);

  return (
    <>
      <div
        className="doc-check-actions"
        style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <button
          type="button"
          className="btn-cancel"
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={selectAllGeneratable}
        >
          Velg alle AI + maler
        </button>
        <button
          type="button"
          className="btn-cancel"
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={resetToSuggested}
        >
          Foreslå på nytt
        </button>
      </div>

      {SOURCE_ORDER.filter((s) => s !== 'user_upload').map((sourceType) => {
        const cfg = SOURCE_CONFIG[sourceType];
        const docs = getDocumentsBySource(sourceType, projectInput);
        if (!docs.length) return null;

        return (
          <section key={sourceType} className="doc-source-section">
            <div className="doc-source-header">
              <span className={`doc-source-badge ${cfg.badgeClass}`}>
                {cfg.icon} {cfg.label}
              </span>
              <p className="doc-source-desc">{cfg.description}</p>
            </div>
            <div className="doc-check-grid">
              {docs.map((doc) => {
                const isCore = CORE_DOCUMENT_IDS.includes(doc.id);
                const checked = selectedSet.has(doc.id) || isCore;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    className="doc-check-item"
                    style={{
                      cursor: isCore ? 'default' : 'pointer',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                    }}
                    disabled={isCore}
                    onClick={() => toggle(doc.id)}
                  >
                    <CheckMark checked={checked} />
                    <span>
                      <span className="doc-check-label">{doc.label}</span>
                      {doc.directive ? (
                        <span className="doc-check-directive">{doc.directive}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="doc-help-box">
        <span className="doc-help-icon">ℹ️</span>
        <p>
          Samsiq genererer AI-dokumenter og maler her. Etter generering vises en
          skreddersydd opplastingsliste på prosjektsiden — basert på maskindataene dine.
        </p>
      </div>

      <div className="form-info" style={{ marginTop: 8 }}>
        {timeLabel}
      </div>
    </>
  );
}

export function useDefaultDocumentSelection(): DocumentId[] {
  return getDefaultSelectedDocuments();
}
