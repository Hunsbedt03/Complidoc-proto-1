'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearGenerationSession,
  persistGenerationSession,
} from '@/lib/generationSession';
import type { DocumentId } from '@/lib/documents/ids';
import { normalizeGeneratedDocs } from '@/lib/documents/ids';
import { getCatalogDocument } from '@/lib/documents/catalog';
import { buildMachineDataForGeneration, generateSingleDocument } from '@/lib/generate';
import {
  updateLocalProjectPayload,
  updateLocalProjectWorkflow,
} from '@/lib/localProjects';
import { saveLocalProjectArchiveLinks } from '@/lib/localArchive';
import { rebuildZipFromDocs } from '@/lib/rebuildZip';
import { hydrateDocumentContents } from '@/lib/revisions/hydrateContents';
import { saveDocumentRevision } from '@/lib/revisions/saveRevision';
import type { ProjectStatus } from '@/lib/projectStatus';
import type {
  GeneratedDoc,
  ProjectArchiveLink,
  ProjectFormData,
  UploadSlot,
  ZipData,
} from '@/lib/types';

type GenerationContextValue = {
  projectId: string | null;
  projectStatus: ProjectStatus;
  zipData: ZipData | null;
  outputTitle: string;
  lastForm: ProjectFormData | null;
  generatedDocuments: GeneratedDoc[];
  documentContents: Record<string, string>;
  uploads: UploadSlot[];
  archiveLinks: ProjectArchiveLink[];
  setArchiveLinks: (links: ProjectArchiveLink[]) => void;
  setResult: (
    zip: ZipData,
    title: string,
    form: ProjectFormData,
    documents: GeneratedDoc[]
  ) => string;
  setUpload: (slot: UploadSlot) => void;
  syncProjectId: (id: string) => void;
  setProjectStatus: (status: ProjectStatus) => void;
  lockProject: (engineerName: string) => void;
  saveDocumentEdit: (
    documentId: DocumentId,
    content: string,
    contentJson: string,
    changeNote: string,
    editorName: string
  ) => Promise<void>;
  restoreDocumentRevision: (
    documentId: DocumentId,
    content: string,
    contentJson: string,
    changeNote: string,
    editorName: string
  ) => Promise<void>;
  setDocumentContent: (documentId: DocumentId, content: string) => void;
  regenerateDocument: (documentId: DocumentId) => Promise<void>;
  setZipFromProject: (
    zip: ZipData,
    title: string,
    meta?: {
      form?: ProjectFormData;
      documents?: GeneratedDoc[];
      projectId?: string;
      status?: ProjectStatus;
      uploads?: UploadSlot[];
      archiveLinks?: ProjectArchiveLink[];
    }
  ) => void;
  addDocumentToProject: (documentId: DocumentId) => void;
  clear: () => void;
};

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error('useGeneration must be used within GenerationProvider');
  return ctx;
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('draft');
  const [zipData, setZipData] = useState<ZipData | null>(null);
  const [outputTitle, setOutputTitle] = useState('');
  const [lastForm, setLastForm] = useState<ProjectFormData | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDoc[]>([]);
  const [documentContents, setDocumentContents] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<UploadSlot[]>([]);
  const [archiveLinks, setArchiveLinksState] = useState<ProjectArchiveLink[]>([]);
  const hydratedForProjectRef = useRef<string | null>(null);

  const setArchiveLinks = useCallback(
    (links: ProjectArchiveLink[]) => {
      setArchiveLinksState(links);
      if (projectId) {
        updateLocalProjectPayload(projectId, { archiveLinks: links });
        saveLocalProjectArchiveLinks(projectId, links);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (projectId && zipData) {
      persistGenerationSession({
        projectId,
        outputTitle: outputTitle || 'Prosjekt',
        projectStatus,
      });
    }
  }, [projectId, zipData, outputTitle, projectStatus]);

  const syncProjectId = useCallback((id: string) => {
    setProjectId(id);
    hydratedForProjectRef.current = null;
  }, []);

  useEffect(() => {
    if (!projectId || generatedDocuments.length === 0) return;
    if (hydratedForProjectRef.current === projectId) return;

    let cancelled = false;
    const docIds = generatedDocuments.map((d) => d.documentId);

    void hydrateDocumentContents(projectId, docIds).then((contents) => {
      if (cancelled) return;
      hydratedForProjectRef.current = projectId;
      setDocumentContents((prev) => ({ ...contents, ...prev }));
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, generatedDocuments]);

  const setUpload = useCallback(
    (slot: UploadSlot) => {
      if (projectStatus === 'locked') return;
      setUploads((prev) => {
        const rest = prev.filter((u) => u.documentId !== slot.documentId);
        const next = [...rest, slot];
        if (projectId) {
          updateLocalProjectWorkflow(projectId, projectStatus, next);
        }
        return next;
      });
      if (projectId && slot.status === 'uploaded') {
        void saveDocumentRevision({
          projectId,
          documentId: slot.documentId,
          content: slot.fileName ?? '',
          contentJson: '',
          changeType: 'file_upload',
          changeNote: `Lastet opp ${slot.fileName ?? 'fil'}`,
          changedByName: lastForm?.ingenior || 'Bruker',
          source: 'file_upload',
          changedBy: 'user',
        }).catch((err) => {
          console.warn('[samsiq] upload revision:', err);
        });
      }
    },
    [projectId, projectStatus, lastForm?.ingenior]
  );

  const lockProject = useCallback(
    (engineerName: string) => {
      if (!projectId) return;
      setProjectStatus('locked');
      updateLocalProjectWorkflow(projectId, 'locked', uploads);
      void saveDocumentRevision({
        projectId,
        documentId: 'risk_assessment',
        content: '',
        contentJson: '',
        changeType: 'locked',
        changeNote: `Prosjektpakke låst av ${engineerName || 'ingeniør'}`,
        changedByName: engineerName || 'Ingeniør',
        source: 'user_edited',
        changedBy: 'user',
      }).catch((err) => {
        console.warn('[samsiq] lock revision:', err);
      });
    },
    [projectId, uploads]
  );

  const setDocumentContent = useCallback((documentId: DocumentId, content: string) => {
    setDocumentContents((prev) => ({ ...prev, [documentId]: content }));
  }, []);

  const regenerateDocument = useCallback(
    async (documentId: DocumentId) => {
      if (!projectId || !lastForm || !zipData || projectStatus === 'locked') return;
      const machineData = await buildMachineDataForGeneration(lastForm);
      const doc = await generateSingleDocument(machineData, documentId);
      const def = getCatalogDocument(documentId);
      const nextDocs = generatedDocuments.map((d) =>
        d.documentId === documentId ? doc : d
      );
      const newZip = await rebuildZipFromDocs(nextDocs, zipData.filename);
      setGeneratedDocuments(normalizeGeneratedDocs(nextDocs));
      setZipData(newZip);
      const html = `<h2>${def?.label ?? documentId}</h2><p>AI-regenerert ${new Date().toLocaleDateString('no-NO')}. Rediger for å tilpasse før endelig låsing.</p>`;
      setDocumentContents((prev) => ({ ...prev, [documentId]: html }));
      await saveDocumentRevision({
        projectId,
        documentId,
        content: html,
        contentJson: JSON.stringify({ type: 'doc', content: [] }),
        changeType: 'ai',
        changeNote: `Regenerert med AI ${new Date().toLocaleDateString('no-NO')}`,
        changedByName: lastForm.ingenior || 'Samsiq AI',
        source: 'ai_regenerated',
        changedBy: 'samsiq-ai',
      });
    },
    [
      projectId,
      lastForm,
      zipData,
      projectStatus,
      generatedDocuments,
    ]
  );

  const addDocumentToProject = useCallback((documentId: DocumentId) => {
    setLastForm((prev) => {
      if (!prev) return prev;
      const existing = prev.addedDocuments ?? [];
      if (existing.includes(documentId)) return prev;
      return {
        ...prev,
        addedDocuments: [...existing, documentId],
      };
    });
  }, []);

  const saveDocumentEdit = useCallback(
    async (
      documentId: DocumentId,
      content: string,
      contentJson: string,
      changeNote: string,
      editorName: string
    ) => {
      if (!projectId || projectStatus === 'locked') return;
      setDocumentContents((prev) => ({ ...prev, [documentId]: content }));
      await saveDocumentRevision({
        projectId,
        documentId,
        content,
        contentJson,
        changeType: 'user_edit',
        changeNote,
        changedByName: editorName || 'Ingeniør',
        source: 'user_edited',
        changedBy: 'user',
      });
    },
    [projectId, projectStatus]
  );

  const restoreDocumentRevision = useCallback(
    async (
      documentId: DocumentId,
      content: string,
      contentJson: string,
      changeNote: string,
      editorName: string
    ) => {
      if (!projectId || projectStatus === 'locked') return;
      setDocumentContents((prev) => ({ ...prev, [documentId]: content }));
      await saveDocumentRevision({
        projectId,
        documentId,
        content,
        contentJson,
        changeType: 'restore',
        changeNote,
        changedByName: editorName || 'Ingeniør',
        source: 'user_edited',
        changedBy: 'user',
      });
    },
    [projectId, projectStatus]
  );

  const value = useMemo(
    () => ({
      projectId,
      projectStatus,
      zipData,
      outputTitle,
      lastForm,
      generatedDocuments,
      documentContents,
      uploads,
      archiveLinks,
      setArchiveLinks,
      setResult: (
        zip: ZipData,
        title: string,
        form: ProjectFormData,
        documents: GeneratedDoc[]
      ) => {
        const id = crypto.randomUUID();
        hydratedForProjectRef.current = id;
        setProjectId(id);
        setProjectStatus('draft');
        setZipData(zip);
        setOutputTitle(title);
        setLastForm(form);
        setGeneratedDocuments(normalizeGeneratedDocs(documents));
        setUploads([]);
        setArchiveLinksState([]);
        const contents: Record<string, string> = {};
        for (const doc of documents) {
          const def = getCatalogDocument(doc.documentId);
          contents[doc.documentId] =
            `<h2>${def?.label ?? doc.documentId}</h2><p>AI-generert dokument. Rediger for å tilpasse før endelig låsing.</p>`;
        }
        setDocumentContents(contents);
        return id;
      },
      setUpload,
      syncProjectId,
      setProjectStatus,
      lockProject,
      saveDocumentEdit,
      restoreDocumentRevision,
      setDocumentContent,
      regenerateDocument,
      addDocumentToProject,
      setZipFromProject: (
        zip: ZipData,
        title: string,
        meta?: {
          form?: ProjectFormData;
          documents?: GeneratedDoc[];
          projectId?: string;
          status?: ProjectStatus;
          uploads?: UploadSlot[];
          archiveLinks?: ProjectArchiveLink[];
        }
      ) => {
        setZipData(zip);
        setOutputTitle(title);
        if (meta?.form) setLastForm(meta.form);
        if (meta?.documents) setGeneratedDocuments(normalizeGeneratedDocs(meta.documents));
        if (meta?.projectId) {
          setProjectId(meta.projectId);
          hydratedForProjectRef.current = null;
        }
        if (meta?.status) setProjectStatus(meta.status);
        if (meta?.uploads) setUploads(meta.uploads);
        if (meta?.archiveLinks) {
          setArchiveLinksState(meta.archiveLinks);
          if (meta.projectId) {
            updateLocalProjectPayload(meta.projectId, {
              archiveLinks: meta.archiveLinks,
            });
            saveLocalProjectArchiveLinks(meta.projectId, meta.archiveLinks);
          }
        }
      },
      clear: () => {
        clearGenerationSession();
        hydratedForProjectRef.current = null;
        setProjectId(null);
        setProjectStatus('draft');
        setZipData(null);
        setOutputTitle('');
        setLastForm(null);
        setGeneratedDocuments([]);
        setDocumentContents({});
        setUploads([]);
        setArchiveLinksState([]);
      },
    }),
    [
      projectId,
      projectStatus,
      zipData,
      outputTitle,
      lastForm,
      generatedDocuments,
      documentContents,
      uploads,
      archiveLinks,
      setArchiveLinks,
      setUpload,
      syncProjectId,
      lockProject,
      saveDocumentEdit,
      restoreDocumentRevision,
      setDocumentContent,
      regenerateDocument,
      addDocumentToProject,
    ]
  );

  return (
    <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
  );
}
