'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DocumentReadOnly } from '@/components/customer/DocumentReadOnly';
import { ProjectAttachmentsSection } from '@/components/project/ProjectAttachmentsSection';

type Banner = {
  kind: string;
  title: string;
  detail?: string;
  canSign: boolean;
};

type DocumentRow = {
  documentId: string;
  label: string;
  filename: string;
  status: string;
  contentHtml: string;
};

type ProjectDetail = {
  id: string;
  name: string;
  supplierName: string;
  form: {
    prosjekt: string;
    kunde: string;
    produsent: string;
    ingenior: string;
    maskintype: string;
    serienummer: string;
  };
  banner: Banner;
  documents: DocumentRow[];
};

type Props = {
  projectId: string;
};

export function CustomerProjectView({ projectId }: Props) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  async function loadDetail() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/customer/projects/${projectId}`);
      const json = (await res.json()) as ProjectDetail & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste prosjekt');
      setDetail(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste prosjekt');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [projectId]);

  async function handleSign() {
    setSigning(true);
    setError('');
    try {
      const res = await fetch(`/api/customer/projects/${projectId}`, {
        method: 'POST',
      });
      const json = (await res.json()) as { error?: string; banner?: Banner };
      if (!res.ok) throw new Error(json.error ?? 'Signering feilet');
      if (json.banner && detail) {
        setDetail({ ...detail, banner: json.banner });
      } else {
        await loadDetail();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signering feilet');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <p className="customer-empty">Laster prosjekt…</p>;
  }

  if (error || !detail) {
    return (
      <div className="customer-content">
        <p className="customer-empty customer-empty--error">{error || 'Prosjekt ikke funnet'}</p>
        <Link href="/app/customer/dashboard" className="btn-dl">
          Tilbake til oversikt
        </Link>
      </div>
    );
  }

  const bannerClass =
    detail.banner.kind === 'awaiting_customer'
      ? 'customer-revision-banner customer-revision-banner--action'
      : detail.banner.kind === 'signed_receipt' || detail.banner.kind === 'fully_signed'
        ? 'customer-revision-banner customer-revision-banner--success'
        : 'customer-revision-banner';

  const expanded = detail.documents.find((d) => d.documentId === expandedDoc);

  return (
    <div className="customer-project-view">
      <Link href="/app/customer/dashboard" className="customer-back-link">
        ← Tilbake til mine prosjekter
      </Link>

      <header className="customer-project-detail-header">
        <h1>{detail.name}</h1>
        <p>Leverandør: {detail.supplierName}</p>
      </header>

      <div className={bannerClass}>
        <p className="customer-revision-banner-title">{detail.banner.title}</p>
        {detail.banner.detail ? (
          <p className="customer-revision-banner-detail">{detail.banner.detail}</p>
        ) : null}
        {detail.banner.canSign ? (
          <button
            type="button"
            className="btn-generate"
            disabled={signing}
            onClick={() => void handleSign()}
          >
            {signing ? 'Signerer…' : 'Signer akseptanseprotokoll'}
          </button>
        ) : null}
      </div>

      <section className="customer-project-meta">
        <h2 className="customer-dashboard-section-title">Prosjektinfo</h2>
        <dl className="customer-meta-grid">
          <div>
            <dt>Kunde</dt>
            <dd>{detail.form.kunde || '—'}</dd>
          </div>
          <div>
            <dt>Produsent</dt>
            <dd>{detail.form.produsent || '—'}</dd>
          </div>
          <div>
            <dt>Maskintype</dt>
            <dd>{detail.form.maskintype || '—'}</dd>
          </div>
          <div>
            <dt>Serienummer</dt>
            <dd>{detail.form.serienummer || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="customer-dashboard-section">
        <h2 className="customer-dashboard-section-title">Dokumenter</h2>
        {expanded ? (
          <DocumentReadOnly
            label={expanded.label}
            content={expanded.contentHtml}
            onClose={() => setExpandedDoc(null)}
          />
        ) : (
          <ul className="customer-doc-list">
            {detail.documents.map((doc) => (
              <li key={doc.documentId} className="customer-doc-row">
                <div>
                  <strong>{doc.label}</strong>
                  <span className="customer-doc-status">
                    {doc.status === 'complete' ? '✓ På plass' : 'Mangler'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-dl"
                  onClick={() => setExpandedDoc(doc.documentId)}
                >
                  Vis
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectAttachmentsSection projectId={projectId} role="customer" />
    </div>
  );
}
