'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DocumentId } from '@/lib/documents/ids';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { estimateTime } from '@/lib/documents/estimates';
import {
  getDefaultSelectedDocuments,
  getVisibleGroups,
  isDocumentVisibleInChecklist,
} from '@/lib/documents/registry';
import { suggestDocuments } from '@/lib/documents/suggest';
import type { ProjectFormData } from '@/lib/types';

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <div
      className={'check-box' + (checked ? ' on' : '')}
      aria-hidden
    >
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

  const visibleGroups = useMemo(
    () => getVisibleGroups(projectInput),
    [projectInput]
  );

  useEffect(() => {
    if (userTouched) return;
    onChange(suggestDocuments(projectInput));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kun auto-forslag ved feltendring
  }, [projectInput.drivsystem, projectInput.installasjonsmiljo, projectInput.marked, userTouched]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function mergeWithCore(ids: Iterable<DocumentId>): DocumentId[] {
    return [...new Set<DocumentId>([...CORE_DOCUMENT_IDS, ...ids])];
  }

  function toggle(id: DocumentId) {
    setUserTouched(true);
    if (CORE_DOCUMENT_IDS.includes(id)) {
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(mergeWithCore(next));
  }

  function selectAllVisible() {
    setUserTouched(true);
    const ids = new Set<DocumentId>(CORE_DOCUMENT_IDS);
    for (const group of visibleGroups) {
      for (const doc of group.documents) {
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

  const timeLabel = estimateTime(selected);

  return (
    <>
      <div className="doc-check-actions" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={selectAllVisible}>
          Velg alle synlige
        </button>
        <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={resetToSuggested}>
          Foreslå på nytt
        </button>
      </div>

      {visibleGroups.map((group) => (
        <div key={group.id} className="doc-check-section" style={{ marginBottom: 16 }}>
          <div
            className="doc-check-section-title"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            {group.title}
          </div>
          <div className="doc-check-grid">
            {group.documents
              .filter((doc) => isDocumentVisibleInChecklist(doc.id, projectInput))
              .map((doc) => {
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
                    {doc.label}
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <div className="form-info" style={{ marginTop: 8 }}>
        {timeLabel}
      </div>
    </>
  );
}

export function useDefaultDocumentSelection(): DocumentId[] {
  return getDefaultSelectedDocuments();
}
