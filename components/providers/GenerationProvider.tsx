'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { buildMachineData, generateSingleDocument } from '@/lib/generate';
import { updateLocalProjectWorkflow } from '@/lib/localProjects';
import { rebuildZipFromDocs } from '@/lib/rebuildZip';
import { appendRevision, seedInitialRevisions } from '@/lib/revisions';
import { saveDocumentRevision } from '@/lib/revisions/saveRevision';
import type { ProjectStatus } from '@/lib/projectStatus';
import type { GeneratedDoc, ProjectFormData, UploadSlot, ZipData } from '@/lib/types';

type GenerationContextValue = {
  projectId: string | null;
  projectStatus: ProjectStatus;
  zipData: ZipData | null;
  outputTitle: string;
  lastForm: ProjectFormData | null;
  generatedDocuments: GeneratedDoc[];
  documentContents: Record<string, string>;
  uploads: UploadSlot[];
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
    }
  ) => void;
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
  }, []);

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
        appendRevision({
          projectId,
          documentId: slot.documentId,
          content: slot.fileName ?? '',
          changeType: 'file_upload',
          changeNote: `Lastet opp ${slot.fileName ?? 'fil'}`,
          changedBy: 'user',
          changedByName: lastForm?.ingenior || 'Bruker',
          source: 'file_upload',
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
      appendRevision({
        projectId,
        documentId: 'risk_assessment',
        content: '',
        changeType: 'locked',
        changeNote: `Prosjektpakke låst av ${engineerName || 'ingeniør'}`,
        changedBy: 'user',
        changedByName: engineerName || 'Ingeniør',
        source: 'user_edited',
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
      const machineData = buildMachineData(lastForm);
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
        changeType: 'ai_regeneration',
        changeNote: `Regenerert av bruker ${new Date().toLocaleDateString('no-NO')}`,
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
      setResult: (
        zip: ZipData,
        title: string,
        form: ProjectFormData,
        documents: GeneratedDoc[]
      ) => {
        const id = crypto.randomUUID();
        setProjectId(id);
        setProjectStatus('draft');
        setZipData(zip);
        setOutputTitle(title);
        setLastForm(form);
        setGeneratedDocuments(normalizeGeneratedDocs(documents));
        setUploads([]);
        const contents: Record<string, string> = {};
        for (const doc of documents) {
          const def = getCatalogDocument(doc.documentId);
          contents[doc.documentId] =
            `<h2>${def?.label ?? doc.documentId}</h2><p>AI-generert dokument. Rediger for å tilpasse før endelig låsing.</p>`;
        }
        setDocumentContents(contents);
        seedInitialRevisions(
          id,
          documents.map((d) => d.documentId),
          form.ingenior || 'Samsiq'
        );
        return id;
      },
      setUpload,
      syncProjectId,
      setProjectStatus,
      lockProject,
      saveDocumentEdit,
      setDocumentContent,
      regenerateDocument,
      setZipFromProject: (
        zip: ZipData,
        title: string,
        meta?: {
          form?: ProjectFormData;
          documents?: GeneratedDoc[];
          projectId?: string;
          status?: ProjectStatus;
          uploads?: UploadSlot[];
        }
      ) => {
        setZipData(zip);
        setOutputTitle(title);
        if (meta?.form) setLastForm(meta.form);
        if (meta?.documents) setGeneratedDocuments(normalizeGeneratedDocs(meta.documents));
        if (meta?.projectId) setProjectId(meta.projectId);
        if (meta?.status) setProjectStatus(meta.status);
        if (meta?.uploads) setUploads(meta.uploads);
      },
      clear: () => {
        clearGenerationSession();
        setProjectId(null);
        setProjectStatus('draft');
        setZipData(null);
        setOutputTitle('');
        setLastForm(null);
        setGeneratedDocuments([]);
        setDocumentContents({});
        setUploads([]);
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
      setUpload,
      syncProjectId,
      lockProject,
      saveDocumentEdit,
      setDocumentContent,
      regenerateDocument,
    ]
  );

  return (
    <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
  );
}
