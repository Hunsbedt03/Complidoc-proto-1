'use client';

import { getDocumentDefinition } from '@/lib/documents/registry';
import { DOC_PREFIX_MAP } from '@/lib/constants';
import { downloadDocFromZip, downloadZip } from '@/lib/download';
import type { GeneratedDoc, ZipData } from '@/lib/types';

const DOC_COLORS = [
  'rgba(226,75,74,0.15)',
  'rgba(26,111,212,0.15)',
  'rgba(97,153,34,0.15)',
  'rgba(239,159,39,0.15)',
  'rgba(120,80,200,0.15)',
  'rgba(60,180,180,0.15)',
];

type Props = {
  zipData: ZipData;
  documents: GeneratedDoc[];
};

export function ProjectDocuments({ zipData, documents }: Props) {
  async function handleDocDownload(doc: GeneratedDoc) {
    const prefix =
      DOC_PREFIX_MAP[doc.documentId] ??
      DOC_PREFIX_MAP[doc.docType] ??
      doc.filename.slice(0, 4);
    try {
      await downloadDocFromZip(zipData, prefix);
    } catch {
      try {
        await downloadDocFromZip(zipData, doc.filename.replace('.docx', ''));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Nedlasting feilet');
      }
    }
  }

  return (
    <>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Genererte dokumenter ({documents.length})
      </div>
      <div className="doc-grid">
        {documents.map((doc, i) => {
          const def = getDocumentDefinition(doc.documentId);
          const name = doc.label ?? def?.label ?? doc.documentId;
          return (
            <div key={doc.documentId + doc.filename} className="doc-card">
              <div className="doc-card-header">
                <div
                  className="doc-card-icon"
                  style={{ background: DOC_COLORS[i % DOC_COLORS.length] }}
                />
                <div>
                  <div className="doc-card-name">{name}</div>
                  <div className="doc-card-sub">
                    Rev.01 · {new Date().toLocaleDateString('no-NO')}
                  </div>
                </div>
              </div>
              <div className="doc-card-desc">{doc.filename}</div>
              <div className="doc-btns">
                <button
                  type="button"
                  className="btn-dl"
                  onClick={() => handleDocDownload(doc)}
                >
                  Last ned .docx
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn-generate"
          style={{ width: '100%' }}
          onClick={() => downloadZip(zipData)}
        >
          Last ned alle som ZIP
        </button>
      </div>
      <p
        className="form-info"
        style={{ marginTop: 12, fontSize: 11 }}
      >
        Revisjonshistorikk (v2+), prosjektlås og arkivmetadata kommer i neste sprint.
      </p>
    </>
  );
}
