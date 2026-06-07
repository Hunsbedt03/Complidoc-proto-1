import { computePackageCompleteness } from './documents/completeness';
import { getCatalogDocument } from './documents/catalog';
import { CORE_DOCUMENT_IDS, normalizeGeneratedDocs } from './documents/ids';
import { projectInputFromForm } from './projectInput';
import type { ProjectStatus } from './projectStatus';
import type { GeneratedDoc, SaveProjectPayload, ProsjektSummary } from './types';

const STORAGE_KEY = 'samsiq-local-projects';

export type LocalProjectRecord = {
  id: string;
  created_at: string;
  payload: SaveProjectPayload;
};

function readAll(): LocalProjectRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalProjectRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: LocalProjectRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function completenessPercent(payload: SaveProjectPayload): number {
  const raw = payload.selectedDocuments ?? CORE_DOCUMENT_IDS;
  const selectedAi = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
  );
  const selectedHybrid = raw.filter(
    (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
  );
  return computePackageCompleteness(
    projectInputFromForm(payload),
    selectedAi,
    selectedHybrid,
    resolveStoredDocuments(payload),
    payload.uploads ?? []
  ).percent;
}

export function saveProjectLocally(payload: SaveProjectPayload): string {
  const records = readAll();
  const id = payload.localProjectId ?? crypto.randomUUID();
  const enriched: SaveProjectPayload = {
    ...payload,
    localProjectId: id,
    completenessPercent: completenessPercent(payload),
    workflowStatus: payload.workflowStatus ?? 'draft',
  };
  const existing = records.findIndex((r) => r.id === id);
  const row: LocalProjectRecord = {
    id,
    created_at: new Date().toISOString(),
    payload: enriched,
  };
  if (existing >= 0) {
    records[existing] = row;
  } else {
    records.unshift(row);
  }
  writeAll(records.slice(0, 20));
  return id;
}

export function listLocalProjects(): ProsjektSummary[] {
  return readAll().map((r) => {
    const ws = r.payload.workflowStatus ?? 'draft';
    const statusLabel =
      ws === 'locked'
        ? 'Godkjent'
        : ws === 'review'
          ? 'Til gjennomgang'
          : 'Under arbeid';
    return {
      id: r.id,
      navn: r.payload.prosjekt,
      produsent: r.payload.produsent || null,
      status: statusLabel,
      workflowStatus: ws,
      completenessPercent: r.payload.completenessPercent ?? 0,
      created_at: r.created_at,
      zip_filename: r.payload.zipFilename,
    };
  });
}

export function getLocalProject(id: string): LocalProjectRecord | null {
  return readAll().find((r) => r.id === id) ?? null;
}

/**
 * Eldre lokale prosjekter kan mangle documents[] selv om ZIP finnes.
 * Gjenoppretter kjernedokumenter slik at fullstendighetsmåler stemmer ved gjenåpning.
 */
export function resolveStoredDocuments(payload: SaveProjectPayload): GeneratedDoc[] {
  if (payload.documents?.length) return normalizeGeneratedDocs(payload.documents);
  const hasZip = Boolean(payload.zipBase64?.length || payload.zipFilename);
  if (!hasZip) return [];
  return CORE_DOCUMENT_IDS.map((documentId) => ({
    documentId,
    docType: documentId,
    filename: `${documentId}.docx`,
    docx: '',
  }));
}

export function updateLocalProjectWorkflow(
  id: string,
  workflowStatus: ProjectStatus,
  uploads?: SaveProjectPayload['uploads']
): void {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const payload = {
    ...records[idx].payload,
    workflowStatus,
    uploads: uploads ?? records[idx].payload.uploads,
  };
  records[idx] = {
    ...records[idx],
    payload: {
      ...payload,
      completenessPercent: completenessPercent(payload),
    },
  };
  writeAll(records);
}
