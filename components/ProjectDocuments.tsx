'use client';

import { useEffect, useState } from 'react';
import { DocumentEditor } from '@/components/DocumentEditor';
import { PlSilVerificationBanner } from '@/components/PlSilVerificationBanner';
import { DocumentRevisionHistory } from '@/components/DocumentRevisionHistory';
import { getDocumentDefinition } from '@/lib/documents/registry';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { generateManglerTxt } from '@/lib/documents/manglerTxt';
import { DOC_PREFIX_MAP } from '@/lib/constants';
import { downloadDocFromZip } from '@/lib/download';
import { downloadZipWithExtras } from '@/lib/downloadPackage';
import { fetchProjectAttachments } from '@/lib/attachments/client';
import {
  loadLinkedAttachmentsForZip,
  mergeAttachmentsIntoZipBase64,
} from '@/lib/attachments/zipExtras';
import { usePackageCompleteness } from '@/lib/usePackageCompleteness';
import { useGeneration } from '@/components/providers/GenerationProvider';
import type { DocumentId } from '@/lib/documents/ids';
import type { GeneratedDoc, ProjectFormData, UploadSlot, ZipData } from '@/lib/types';
import type { ProjectStatus } from '@/lib/projectStatus';
import { fetchProjectRevisions } from '@/lib/revisions/saveRevision';

const DOC_COLORS = [
  'var(--bg-danger)',
  'var(--bg-accent)',
  'var(--bg-success)',
  'var(--bg-warning)',
  'var(--surface-2)',
  'var(--bg-accent)',
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
    documentContentJson,
    saveDocumentEdit,
    restoreDocumentRevision,
    setDocumentContent,
    regenerateDocument,
  } = useGeneration();
  const [expandedId, setExpandedId] = useState<DocumentId | null>(null);
  const [docTab, setDocTab] = useState<'content' | 'history'>('content');
  const [regenerating, setRegenerating] = useState<DocumentId | null>(null);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);
  const [revisionMeta, setRevisionMeta] = useState<
    Record<string, { latest: number; count: number }>
  >({});

  useEffect(() => {
    if (!projectId || !documents.length) {
      setRevisionMeta({});
      return;
    }
    let cancelled = false;
    void fetchProjectRevisions(projectId)
      .then((allRows) => {
        if (cancelled) return;
        const next: Record<string, { latest: number; count: number }> = {};
        for (const doc of documents) {
          const rows = allRows.filter((r) => r.documentId === doc.documentId);
          next[doc.documentId] = {
            latest: rows[0]?.revision ?? 1,
            count: rows.length,
          };
        }
        setRevisionMeta(next);
      })
      .catch(() => {
        if (cancelled) return;
        setRevisionMeta({});
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, documents, revisionRefreshKey]);

  const missingCount = completeness.missingRequired.length;
  const isComplete = completeness.isComplete;

  async function handleZipDownload() {
    const manglerTxt = generateManglerTxt(
      completeness.missingRequiredDocs,
      form.prosjekt || form.maskin,
      projectId
    );

    let zipBase64 = zipData.zip;
    if (projectId) {
      try {
        const { attachments } = await fetchProjectAttachments(projectId);
        const entries = await loadLinkedAttachmentsForZip(projectId, attachments);
        if (entries.length) {
          zipBase64 = await mergeAttachmentsIntoZipBase64(zipBase64, entries);
        }
      } catch (err) {
        console.warn('[samsiq] zip attachments:', err);
      }
    }

    await downloadZipWithExtras(
      { ...zipData, zip: zipBase64 },
      {
        manglerTxt: isComplete ? undefined : manglerTxt,
        utkast: !isComplete,
      }
    );
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

  async function handleDocExport(doc: GeneratedDoc, format: 'docx' | 'pdf') {
    if (!projectId) {
      await handleDocDownload(doc);
      return;
    }
    const path = `/api/projects/${projectId}/documents/${doc.documentId}/export-${format}`;
    try {
      const res = await fetch(path, { method: 'POST' });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Eksport feilet');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.documentId}_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Eksport feilet');
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
          const meta = revisionMeta[doc.documentId];
          const rev = meta?.latest ?? 1;
          const historyCount = meta?.count ?? 0;
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
              {doc.documentId === 'safety_function_analysis' ? (
                <PlSilVerificationBanner compact />
              ) : null}
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
                  onClick={() => void handleDocExport(doc, 'docx')}
                >
                  Last ned DOCX
                </button>
                <button
                  type="button"
                  className="btn-dl"
                  onClick={() => void handleDocExport(doc, 'pdf')}
                >
                  Last ned PDF
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => handleDocDownload(doc)}
                  title="Original AI-DOCX fra ZIP"
                >
                  ZIP-kopi
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
                      documentId={doc.documentId}
                      initialContent={
                        documentContents[doc.documentId] ??
                        `<p>${name}</p>`
                      }
                      initialContentJson={documentContentJson[doc.documentId]}
                      paperMeta={{
                        title: name,
                        project: form.prosjekt || '—',
                        machine: form.maskin || form.prosjekt || '—',
                        revision: revisionMeta[doc.documentId]?.latest ?? rev,
                        date: new Date().toLocaleDateString('no-NO'),
                        produsent: form.produsent,
                        serienr: form.serienr,
                        kunde: form.kunde,
                        ingenior: form.ingenior,
                        documentId: doc.documentId,
                      }}
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
                              : `<p>${r.content}</p>`,
                            r.contentJson ?? ''
                          );
                          setDocTab('content');
                        }
                      }}
                      onRestore={(r) => {
                        void restoreDocumentRevision(
                          doc.documentId,
                          r.content,
                          r.contentJson ?? '',
                          `Gjenopprettet til v${r.revision}`,
                          form.ingenior
                        )
                          .then(() => setRevisionRefreshKey((k) => k + 1))
                          .catch((err) => {
                            alert(
                              err instanceof Error
                                ? err.message
                                : 'Gjenoppretting feilet'
                            );
                          });
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
