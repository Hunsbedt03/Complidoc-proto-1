import type { SaveProjectPayload, ProsjektSummary } from './types';

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

export function saveProjectLocally(payload: SaveProjectPayload): string {
  const records = readAll();
  const id = crypto.randomUUID();
  records.unshift({
    id,
    created_at: new Date().toISOString(),
    payload,
  });
  writeAll(records.slice(0, 20));
  return id;
}

export function listLocalProjects(): ProsjektSummary[] {
  return readAll().map((r) => ({
    id: r.id,
    navn: r.payload.prosjekt,
    produsent: r.payload.produsent || null,
    status: 'fullført',
    created_at: r.created_at,
    zip_filename: r.payload.zipFilename,
  }));
}

export function getLocalProject(id: string): LocalProjectRecord | null {
  return readAll().find((r) => r.id === id) ?? null;
}
