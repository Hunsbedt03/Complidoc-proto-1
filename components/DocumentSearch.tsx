'use client';

import { useMemo, useState } from 'react';
import type { DocumentId } from '@/lib/documents/ids';
import { getActiveDocumentIds, searchDocuments } from '@/lib/documents/requirements';
import { projectInputFromForm } from '@/lib/projectInput';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { ProjectFormData } from '@/lib/types';

type Props = {
  form: ProjectFormData;
  onAdd: (documentId: DocumentId) => void;
  disabled?: boolean;
};

export function DocumentSearch({ form, onAdd, disabled = false }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const projectInput = useMemo(() => projectInputFromForm(form), [form]);

  const selectedAi = useMemo(() => {
    const raw = form.selectedDocuments ?? CORE_DOCUMENT_IDS;
    return raw.filter(
      (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
    );
  }, [form.selectedDocuments]);

  const selectedHybrid = useMemo(() => {
    const raw = form.selectedDocuments ?? [];
    return raw.filter((id) => getCatalogDocument(id)?.sourceType === 'hybrid');
  }, [form.selectedDocuments]);

  const activeIds = useMemo(
    () => getActiveDocumentIds(projectInput, selectedAi, selectedHybrid),
    [projectInput, selectedAi, selectedHybrid]
  );

  const searchResults = useMemo(
    () => searchDocuments(searchQuery, projectInput, activeIds),
    [searchQuery, projectInput, activeIds]
  );

  return (
    <div className="document-search">
      <h3 className="document-search-title">Mangler et dokument?</h3>
      <div className="document-search-input-wrap">
        <span className="document-search-icon" aria-hidden>
          ⌕
        </span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Søk etter dokumenttype, standard eller direktiv…"
          className="document-search-input"
          disabled={disabled}
        />
      </div>

      {searchResults.length > 0 ? (
        <div className="document-search-results">
          {searchResults.map((doc) => (
            <div key={doc.id} className="document-search-row">
              <div>
                <p className="document-search-row-label">{doc.label}</p>
                <p className="document-search-row-meta">
                  {doc.directive ?? doc.standard ?? doc.category}
                </p>
              </div>
              <button
                type="button"
                className="btn-dl document-search-add"
                disabled={disabled}
                onClick={() => onAdd(doc.id)}
              >
                + Legg til
              </button>
            </div>
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <p className="document-search-empty">Ingen treff — prøv et annet søkeord</p>
      ) : null}
    </div>
  );
}
