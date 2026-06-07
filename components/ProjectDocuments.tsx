'use client';

import { useState } from 'react';
import { DocumentEditor } from '@/components/DocumentEditor';
import { DocumentRevisionHistory } from '@/components/DocumentRevisionHistory';
import { getDocumentDefinition } from '@/lib/documents/registry';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { generateManglerTxt } from '@/lib/documents/manglerTxt';
import { DOC_PREFIX_MAP } from '@/lib/constants';
import { downloadDocFromZip } from '@/lib/download';
import { downloadZipWithExtras } from '@/lib/downloadPackage';
import { usePackageCompleteness } from '@/lib/usePackageCompleteness';
import { useGeneration } from '@/components/providers/GenerationProvider';
import type { DocumentId } from '@/lib/documents/ids';
import type { GeneratedDoc, ProjectFormData, UploadSlot, ZipData } from '@/lib/types';
import type { ProjectStatus } from '@/lib/projectStatus';
import { getDocumentRevisions } from '@/lib/revisions';

const DOC_COLORS = [
  'rgba(226,75,74,0.15)',
  'rgba(26,111,212,0.15)',
  'rgba(97,153,34,0.15)',
  'rgba(239,159,39,0.15)',
  'rgba(120,80,200,0.15)',
  'rgba(60,180,180,0.15)',
];

function contentPreview(html: string | undefined, fallback: string): string {
  if (!html) return fallback;
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

type Props = {
  zipData: ZipData;
  documents: GeneratedDoc[];
  form: ProjectFormData;
  uploads: UploadSlot[];
  projectStatus: ProjectStatus;
};

export function ProjectDocuments({
  zipData,
  documents,
  form,
  uploads,
  projectStatus,
}: Props) {
  const completeness = usePackageCompleteness(form, documents, uploads);
  const {
    projectId,
    documentContents,
    saveDocumentEdit,
    setDocumentContent,
    regenerateDocument,
  } = useGeneration();
  const [expandedId, setExpandedId] = useState<DocumentId | null>(null);
  const [docTab, setDocTab] = useState<'content' | 'history'>('content');
  const [regenerating, setRegenerating] = useState<DocumentId | null>(null);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);

  const missingCount = completeness.missingRequired.length;
  const isComplete = completeness.isComplete;

  async function handleZipDownload() {
    const manglerTxt = generateManglerTxt(
      completeness.missingRequiredDocs,
      form.prosjekt || form.maskin,
      projectId
    );
    await downloadZipWithExtras(zipData, {
      manglerTxt: isComplete ? undefined : manglerTxt,
      utkast: !isComplete,
    });
  }

  async function handleDocDownload(doc: GeneratedDoc) {
    const prefix =
      DOC_PREFIX_MAP[doc.documentId] ??
      DOC_PREFIX_MAP[doc.docType] ??
      doc.filename.slice(0, 4);
    try {
      await downloadDocFromZip(zipData, prefix);
    } catch {
      try {
        await downloadDocFromZip(zipData, doc.filename.replace('.docx', ''));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Nedlasting feilet');
      }
    }
  }

  const editable = projectStatus !== 'locked';

  return (
    <>
      <div className="download-actions">
        <button
          type="button"
          className="btn-generate"
          style={{ width: '100%' }}
          onClick={() => void handleZipDownload()}
        >
          {isComplete
            ? 'Last ned komplett pakke (ZIP)'
            : 'Last ned utkast (ZIP)'}
        </button>
        {!isComplete ? (
          <p className="download-sublabel">
            Mangler {missingCount} dokument{missingCount === 1 ? '' : 'er'} —{' '}
            MANGLER.txt legges ved i ZIP
          </p>
        ) : null}
      </div>

      <div className="section-label" style={{ marginBottom: 10, marginTop: 20 }}>
        Genererte dokumenter ({documents.length})
      </div>
      <div className="doc-grid">
        {documents.map((doc, i) => {
          const def = getDocumentDefinition(doc.documentId);
          const catalog = getCatalogDocument(doc.documentId);
          const name = doc.label ?? def?.label ?? doc.documentId;
          const canEdit =
            editable &&
            (catalog?.sourceType === 'ai_generated' ||
              catalog?.sourceType === 'hybrid');
          const revisions = projectId
            ? getDocumentRevisions(projectId, doc.documentId)
            : [];
          const rev = revisions[0]?.revision ?? 1;
          const historyCount = revisions.length;
          const expanded = expandedId === doc.documentId;
          const preview = contentPreview(
            documentContents[doc.documentId],
            doc.filename
          );

          return (
            <div key={doc.documentId + doc.filename} className="doc-card doc-card--wide">
              <div className="doc-card-header">
                <div
                  className="doc-card-icon"
                  style={{ background: DOC_COLORS[i % DOC_COLORS.length] }}
                />
                <div className="doc-card-body">
                  <div className="doc-card-name-row">
                    <span className="doc-card-name">{name}</span>
                    <span className="doc-card-badge">AI — ferdig</span>
                    <span className="doc-card-rev">v{rev}</span>
                  </div>
                  <p className="doc-card-preview">{preview}</p>
                </div>
              </div>
              <div className="doc-btns">
                {canEdit ? (
                  <button
                    type="button"
                    className="btn-dl"
                    onClick={() => {
                      setExpandedId(expanded && docTab === 'content' ? null : doc.documentId);
                      setDocTab('content');
                    }}
                  >
                    Rediger
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-dl"
                  onClick={() => handleDocDownload(doc)}
                >
                  Last ned
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn-cancel"
                    disabled={regenerating === doc.documentId}
                    onClick={() => {
                      if (
                        !confirm(
                          'Dette vil erstatte gjeldende innhold med en ny AI-generering. Gjeldende versjon lagres i historikken. Fortsette?'
                        )
                      ) {
                        return;
                      }
                      setRegenerating(doc.documentId);
                      void regenerateDocument(doc.documentId)
                        .then(() => setRevisionRefreshKey((k) => k + 1))
                        .catch((err) => {
                          alert(
                            err instanceof Error
                              ? err.message
                              : 'Regenerering feilet'
                          );
                        })
                        .finally(() => setRegenerating(null));
                    }}
                  >
                    {regenerating === doc.documentId
                      ? 'Regenererer…'
                      : 'Regenerer med AI'}
                  </button>
                ) : null}
                {canEdit && projectId ? (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setExpandedId(expanded && docTab === 'history' ? null : doc.documentId);
                      setDocTab('history');
                    }}
                  >
                    Historikk ({historyCount || 1})
                  </button>
                ) : null}
              </div>

              {expanded && projectId && canEdit ? (
                <div className="doc-card-expanded">
                  <div className="doc-tabs">
                    <button
                      type="button"
                      className={'doc-tab' + (docTab === 'content' ? ' on' : '')}
                      onClick={() => setDocTab('content')}
                    >
                      Innhold
                    </button>
                    <button
                      type="button"
                      className={'doc-tab' + (docTab === 'history' ? ' on' : '')}
                      onClick={() => setDocTab('history')}
                    >
                      Historikk ({historyCount || 1})
                    </button>
                  </div>
                  {docTab === 'content' ? (
                    <DocumentEditor
                      documentLabel={name}
                      initialContent={
                        documentContents[doc.documentId] ??
                        `<p>${name}</p>`
                      }
                      projectStatus={projectStatus}
                      onSave={async (content, json, note) => {
                        await saveDocumentEdit(
                          doc.documentId,
                          content,
                          json,
                          note,
                          form.ingenior
                        );
                        setRevisionRefreshKey((k) => k + 1);
                      }}
                      onCancel={() => setExpandedId(null)}
                    />
                  ) : (
                    <DocumentRevisionHistory
                      projectId={projectId}
                      documentId={doc.documentId}
                      projectStatus={projectStatus}
                      currentRevision={rev}
                      refreshKey={revisionRefreshKey}
                      onView={(r) => {
                        if (r.content) {
                          setDocumentContent(
                            doc.documentId,
                            r.content.startsWith('<')
                              ? r.content
                              : `<p>${r.content}</p>`
                          );
                          setDocTab('content');
                        }
                      }}
                      onRestore={(r) => {
                        void saveDocumentEdit(
                          doc.documentId,
                          r.content,
                          r.contentJson ?? '',
                          `Gjenopprettet fra v${r.revision}`,
                          form.ingenior
                        ).then(() => setRevisionRefreshKey((k) => k + 1));
                        setDocTab('content');
                      }}
                    />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
