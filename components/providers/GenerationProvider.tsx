'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GeneratedDoc, ProjectFormData, ZipData } from '@/lib/types';

type GenerationContextValue = {
  zipData: ZipData | null;
  outputTitle: string;
  lastForm: ProjectFormData | null;
  generatedDocuments: GeneratedDoc[];
  setResult: (
    zip: ZipData,
    title: string,
    form: ProjectFormData,
    documents: GeneratedDoc[]
  ) => void;
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
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDoc[]>([]);

  const value = useMemo(
    () => ({
      zipData,
      outputTitle,
      lastForm,
      generatedDocuments,
      setResult: (
        zip: ZipData,
        title: string,
        form: ProjectFormData,
        documents: GeneratedDoc[]
      ) => {
        setZipData(zip);
        setOutputTitle(title);
        setLastForm(form);
        setGeneratedDocuments(documents);
      },
      setZipFromProject: (zip: ZipData, title: string) => {
        setZipData(zip);
        setOutputTitle(title);
      },
      clear: () => {
        setZipData(null);
        setOutputTitle('');
        setLastForm(null);
        setGeneratedDocuments([]);
      },
    }),
    [zipData, outputTitle, lastForm, generatedDocuments]
  );

  return (
    <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
  );
}
