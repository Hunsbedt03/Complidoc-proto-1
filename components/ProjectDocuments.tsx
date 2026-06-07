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
          const rev = projectId
            ? getDocumentRevisions(projectId, doc.documentId)[0]?.revision ?? 1
            : 1;
          const expanded = expandedId === doc.documentId;

          return (
            <div key={doc.documentId + doc.filename} className="doc-card doc-card--wide">
              <div className="doc-card-header">
                <div
                  className="doc-card-icon"
                  style={{ background: DOC_COLORS[i % DOC_COLORS.length] }}
                />
                <div>
                  <div className="doc-card-name">{name}</div>
                  <div className="doc-card-sub">
                    v{rev} · {new Date().toLocaleDateString('no-NO')}
                  </div>
                </div>
              </div>
              <div className="doc-card-desc">{doc.filename}</div>
              <div className="doc-btns">
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
                    onClick={() => {
                      setExpandedId(expanded ? null : doc.documentId);
                      setDocTab('content');
                    }}
                  >
                    {expanded ? 'Lukk' : 'Åpne / rediger'}
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
                      Historikk
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
                      onSave={(content, json, note) =>
                        saveDocumentEdit(
                          doc.documentId,
                          content,
                          json,
                          note,
                          form.ingenior
                        )
                      }
                      onCancel={() => setExpandedId(null)}
                      onRegenerate={
                        regenerating === doc.documentId
                          ? undefined
                          : () => {
                              setRegenerating(doc.documentId);
                              void regenerateDocument(doc.documentId)
                                .catch((err) => {
                                  alert(
                                    err instanceof Error
                                      ? err.message
                                      : 'Regenerering feilet'
                                  );
                                })
                                .finally(() => setRegenerating(null));
                            }
                      }
                    />
                  ) : (
                    <DocumentRevisionHistory
                      projectId={projectId}
                      documentId={doc.documentId}
                      projectStatus={projectStatus}
                      onView={(r) => {
                        if (r.content) {
                          setDocumentContent(
                            doc.documentId,
                            r.content.startsWith('<')
                              ? r.content
                              : `<p>${r.content}</p>`
                          );
                          setExpandedId(doc.documentId);
                          setDocTab('content');
                        }
                      }}
                      onRestore={(r) => {
                        saveDocumentEdit(
                          doc.documentId,
                          r.content,
                          r.contentJson ?? '',
                          `Gjenopprettet fra v${r.revision}`,
                          form.ingenior
                        );
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
