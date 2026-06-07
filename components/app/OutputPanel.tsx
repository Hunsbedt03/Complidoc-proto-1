'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LockProjectButton } from '@/components/LockProjectButton';
import { ProjectActivityLog } from '@/components/ProjectActivityLog';
import { ProjectDocuments } from '@/components/ProjectDocuments';
import { ProjectPackageOverview } from '@/components/ProjectPackageOverview';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { getDocumentDefinition } from '@/lib/documents/registry';
import { usePackageCompleteness } from '@/lib/usePackageCompleteness';
import { createClient } from '@/lib/supabase/client';
import { readGenerationSession } from '@/lib/generationSession';
import {
  getLocalProject,
  resolveStoredDocuments,
  updateLocalProjectWorkflow,
} from '@/lib/localProjects';
import { loadProjectSession } from '@/lib/projects';
import { rebuildZipFromDocs } from '@/lib/rebuildZip';
import { persistWorkflowStatus } from '@/lib/persistWorkflow';
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/lib/projectStatus';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { EMPTY_FORM } from '@/lib/constants';

const FALLBACK_DOCS = CORE_DOCUMENT_IDS.map((id) => {
  const def = getDocumentDefinition(id);
  return {
    documentId: id,
    docType: id,
    filename: '',
    docx: '',
    label: def?.label,
  };
});

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cls =
    status === 'locked'
      ? 'badge-done'
      : status === 'review'
        ? 'badge-review'
        : 'badge-draft';
  return (
    <span className={'badge ' + cls}>{PROJECT_STATUS_LABELS[status]}</span>
  );
}

export function OutputPanel() {
  const router = useRouter();
  const {
    zipData,
    outputTitle,
    lastForm,
    generatedDocuments,
    uploads,
    setUpload,
    projectStatus,
    setProjectStatus,
    lockProject,
    projectId,
    setZipFromProject,
  } = useGeneration();

  const [restoring, setRestoring] = useState(false);

  function setWorkflowStatus(status: ProjectStatus) {
    setProjectStatus(status);
    if (projectId) {
      updateLocalProjectWorkflow(projectId, status, uploads);
      void persistWorkflowStatus(projectId, status);
    }
  }

  function handleLock() {
    lockProject(form.ingenior);
    if (projectId) void persistWorkflowStatus(projectId, 'locked');
  }

  const documents =
    generatedDocuments.length > 0 ? generatedDocuments : FALLBACK_DOCS;
  const form = lastForm ?? { ...EMPTY_FORM };
  const completeness = usePackageCompleteness(form, documents, uploads);

  useEffect(() => {
    if (zipData) return;

    const session = readGenerationSession();
    if (!session) {
      router.replace('/app/new');
      return;
    }

    let cancelled = false;
    setRestoring(true);

    (async () => {
      const local = getLocalProject(session.projectId);
      if (local) {
        const documents = resolveStoredDocuments(local.payload);
        const zip =
          local.payload.zipBase64?.length
            ? {
                zip: local.payload.zipBase64,
                filename: local.payload.zipFilename || 'Samsiq.zip',
              }
            : await rebuildZipFromDocs(
                documents,
                local.payload.zipFilename || 'Samsiq.zip'
              );

        if (cancelled) return;

        setZipFromProject(zip, local.payload.prosjekt || session.outputTitle, {
          form: local.payload,
          documents,
          projectId: local.id,
          status: local.payload.workflowStatus ?? session.projectStatus,
          uploads: local.payload.uploads ?? [],
        });
        setRestoring(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const cloud = await loadProjectSession(
          supabase,
          user.id,
          session.projectId
        );
        if (cloud && !cancelled) {
          setZipFromProject(
            { zip: cloud.zip, filename: cloud.filename },
            cloud.title,
            {
              form: cloud.form,
              documents: cloud.documents,
              projectId: cloud.projectId,
              status: cloud.workflowStatus,
              uploads: cloud.uploads,
            }
          );
          setRestoring(false);
          return;
        }
      }

      if (!cancelled) router.replace('/app/new');
    })().catch(() => {
      if (!cancelled) router.replace('/app/new');
    });

    return () => {
      cancelled = true;
    };
  }, [zipData, router, setZipFromProject]);

  if (!zipData) {
    return restoring ? (
      <p style={{ color: '#9CA3AF', fontSize: 14 }}>Gjenoppretter prosjekt…</p>
    ) : null;
  }

  const documentLabels = Object.fromEntries(
    documents.map((d) => [
      d.documentId,
      d.label ?? getDocumentDefinition(d.documentId)?.label ?? d.documentId,
    ])
  );

  return (
    <>
      <div className="success-bar">
        <div className="success-dot" />
        <div className="success-text" id="output-title">
          Dokumentpakke — {outputTitle}
        </div>
        <StatusBadge status={projectStatus} />
      </div>

      <div className="output-workflow">
        {projectStatus !== 'locked' ? (
          <>
            {projectStatus === 'draft' ? (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setWorkflowStatus('review')}
              >
                Marker klar for gjennomgang
              </button>
            ) : (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setWorkflowStatus('draft')}
              >
                Tilbake til utkast
              </button>
            )}
            <LockProjectButton
              projectStatus={projectStatus}
              completeness={completeness}
              engineerName={form.ingenior}
              onLock={handleLock}
            />
          </>
        ) : null}
      </div>

      <ProjectPackageOverview
        form={form}
        generatedDocuments={documents}
        uploads={uploads}
        projectId={projectId}
        projectStatus={projectStatus}
        onUploadChange={setUpload}
      />

      <ProjectDocuments
        zipData={zipData}
        documents={documents}
        form={form}
        uploads={uploads}
        projectStatus={projectStatus}
      />

      {projectId ? (
        <ProjectActivityLog
          projectId={projectId}
          documentLabels={documentLabels}
        />
      ) : null}

      <div className="output-actions">
        <Link href="/app/new" className="btn-new">
          Nytt prosjekt
        </Link>
        <Link href="/app/dashboard" className="btn-new">
          Tilbake
        </Link>
      </div>
    </>
  );
}
