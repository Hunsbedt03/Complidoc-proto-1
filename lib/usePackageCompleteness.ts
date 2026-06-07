'use client';

import { useMemo } from 'react';
import { getCatalogDocument } from '@/lib/documents/catalog';
import {
  computePackageCompleteness,
  type PackageCompleteness,
} from '@/lib/documents/completeness';
import { projectInputFromForm } from '@/lib/projectInput';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import type { GeneratedDoc, ProjectFormData, UploadSlot } from '@/lib/types';

export function usePackageCompleteness(
  form: ProjectFormData,
  generatedDocuments: GeneratedDoc[],
  uploads: UploadSlot[],
  generating = false
): PackageCompleteness {
  const projectInput = useMemo(() => projectInputFromForm(form), [form]);

  const selectedAi = useMemo(() => {
    const raw = form.selectedDocuments ?? CORE_DOCUMENT_IDS;
    return raw.filter(
      (id) => getCatalogDocument(id)?.sourceType === 'ai_generated'
    );
  }, [form.selectedDocuments]);

  const selectedHybrid = useMemo(() => {
    const raw = form.selectedDocuments ?? [];
    return raw.filter((id) => getCatalogDocument(id)?.sourceType === 'hybrid');
  }, [form.selectedDocuments]);

  return useMemo(
    () =>
      computePackageCompleteness(
        projectInput,
        selectedAi,
        selectedHybrid,
        generatedDocuments,
        uploads,
        generating
      ),
    [
      projectInput,
      selectedAi,
      selectedHybrid,
      generatedDocuments,
      uploads,
      generating,
    ]
  );
}
