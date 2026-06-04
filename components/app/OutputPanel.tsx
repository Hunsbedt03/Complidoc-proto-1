'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ProjectDocuments } from '@/components/ProjectDocuments';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { CORE_DOCUMENT_IDS } from '@/lib/documents/ids';
import { getDocumentDefinition } from '@/lib/documents/registry';

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

export function OutputPanel() {
  const router = useRouter();
  const { zipData, outputTitle, generatedDocuments } = useGeneration();

  useEffect(() => {
    if (!zipData) router.replace('/app/new');
  }, [zipData, router]);

  if (!zipData) return null;

  const documents =
    generatedDocuments.length > 0 ? generatedDocuments : FALLBACK_DOCS;

  return (
    <>
      <div className="success-bar">
        <div className="success-dot" />
        <div className="success-text" id="output-title">
          Dokumentpakke generert — {outputTitle}
        </div>
      </div>
      <ProjectDocuments zipData={zipData} documents={documents} />
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
