'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProjectFormData, ZipData } from '@/lib/types';

type GenerationContextValue = {
  zipData: ZipData | null;
  outputTitle: string;
  lastForm: ProjectFormData | null;
  setResult: (zip: ZipData, title: string, form: ProjectFormData) => void;
  setZipFromProject: (zip: ZipData, title: string) => void;
  clear: () => void;
};

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error('useGeneration must be used within GenerationProvider');
  return ctx;
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [zipData, setZipData] = useState<ZipData | null>(null);
  const [outputTitle, setOutputTitle] = useState('');
  const [lastForm, setLastForm] = useState<ProjectFormData | null>(null);

  const value = useMemo(
    () => ({
      zipData,
      outputTitle,
      lastForm,
      setResult: (zip: ZipData, title: string, form: ProjectFormData) => {
        setZipData(zip);
        setOutputTitle(title);
        setLastForm(form);
      },
      setZipFromProject: (zip: ZipData, title: string) => {
        setZipData(zip);
        setOutputTitle(title);
      },
      clear: () => {
        setZipData(null);
        setOutputTitle('');
        setLastForm(null);
      },
    }),
    [zipData, outputTitle, lastForm]
  );

  return (
    <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
  );
}
