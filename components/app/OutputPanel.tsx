'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { downloadDocFromZip, downloadZip } from '@/lib/download';

const DOCS = [
  {
    key: 'risk',
    name: 'Risikovurdering',
    sub: 'FS-RISK · Rev.01',
    desc: 'EN ISO 12100:2010 · RPN-matrise · Tiltaksplan',
    color: 'rgba(226,75,74,0.15)',
  },
  {
    key: 'tech',
    name: 'Teknisk fil',
    sub: 'FS-TECH · Rev.01',
    desc: 'Komplett teknisk dokumentasjon · 2006/42/EC',
    color: 'rgba(26,111,212,0.15)',
  },
  {
    key: 'doc',
    name: 'Samsvarserklæring',
    sub: 'EF-DoC · Rev.01',
    desc: 'Maskindirektivet · LVD · EMC',
    color: 'rgba(97,153,34,0.15)',
  },
  {
    key: 'qc',
    name: 'QC-sjekkliste',
    sub: 'FS-QC · Rev.01',
    desc: 'Tilpasset maskintype · Mekanisk · Elektrisk · Sikkerhet',
    color: 'rgba(239,159,39,0.15)',
  },
];

export function OutputPanel() {
  const router = useRouter();
  const { zipData, outputTitle } = useGeneration();

  useEffect(() => {
    if (!zipData) router.replace('/app/new');
  }, [zipData, router]);

  if (!zipData) return null;

  async function handleDocDownload(prefix: string) {
    try {
      await downloadDocFromZip(zipData!, prefix);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nedlasting feilet');
    }
  }

  return (
    <>
      <div className="success-bar">
        <div className="success-dot" />
        <div className="success-text" id="output-title">
          Dokumentpakke generert — {outputTitle}
        </div>
      </div>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Genererte dokumenter
      </div>
      <div className="doc-grid">
        {DOCS.map((doc) => (
          <div key={doc.key} className="doc-card">
            <div className="doc-card-header">
              <div className="doc-card-icon" style={{ background: doc.color }} />
              <div>
                <div className="doc-card-name">{doc.name}</div>
                <div className="doc-card-sub">{doc.sub}</div>
              </div>
            </div>
            <div className="doc-card-desc">{doc.desc}</div>
            <div className="doc-btns">
              <button className="btn-dl" type="button" onClick={() => handleDocDownload(doc.key)}>
                Last ned .docx
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="output-actions">
        <button className="btn-zip" type="button" onClick={() => downloadZip(zipData)}>
          Last ned alle (.zip)
        </button>
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
