import type { ProjectStatus } from './projectStatus';

const SESSION_KEY = 'samsiq-active-project';

export type GenerationSessionRef = {
  projectId: string;
  outputTitle: string;
  projectStatus: ProjectStatus;
};

export function persistGenerationSession(ref: GenerationSessionRef): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ref));
  } catch {
    /* quota — ignore */
  }
}

export function readGenerationSession(): GenerationSessionRef | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GenerationSessionRef;
    if (!parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGenerationSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}
