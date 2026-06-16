'use client';

import type { ActiveUserContext } from '@/lib/user-context/types';

const STORAGE_KEY = 'samsiq_active_context';

export function readActiveContext(): ActiveUserContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveUserContext;
    if (parsed?.type && parsed?.id) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeActiveContext(context: ActiveUserContext): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function clearActiveContext(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
