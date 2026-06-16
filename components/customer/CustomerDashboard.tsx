'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CustomerDashboardProject } from '@/lib/customer-portal/types';

export function CustomerDashboard() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [projects, setProjects] = useState<CustomerDashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/customer/projects')
      .then(async (res) => {
        const json = (await res.json()) as {
          organizationName?: string;
          projects?: CustomerDashboardProject[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste prosjekter');
        setOrganizationName(json.organizationName ?? 'Kunde');
        setProjects(json.projects ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Kunne ikke laste prosjekter');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="customer-empty">Laster prosjekter…</p>;
  }

  if (error) {
    return <p className="customer-empty customer-empty--error">{error}</p>;
  }

  return (
    <div className="customer-dashboard">
      <header className="customer-dashboard-header">
        <div>
          <p className="customer-dashboard-kicker">Kundeorganisasjon</p>
          <h1 className="customer-dashboard-title">{organizationName}</h1>
        </div>
      </header>

      <section className="customer-dashboard-section">
        <h2 className="customer-dashboard-section-title">Mine prosjekter</h2>

        {projects.length === 0 ? (
          <div className="customer-empty-card">
            <p className="customer-empty-title">Ingen dokumentasjonspakker ennå</p>
            <p className="customer-empty-text">
              Du har ingen dokumentasjonspakker ennå. Når en leverandør inviterer deg
              til et prosjekt, vil det vises her automatisk.
            </p>
          </div>
        ) : (
          <ul className="customer-project-list">
            {projects.map((project) => (
              <li key={project.id} className="customer-project-card">
                <div className="customer-project-card-main">
                  <h3 className="customer-project-name">{project.name}</h3>
                  <p className="customer-project-supplier">
                    Leverandør: {project.supplierName}
                  </p>
                  <p
                    className={
                      'customer-project-status' +
                      (project.status.kind === 'awaiting_signature'
                        ? ' customer-project-status--action'
                        : '')
                    }
                  >
                    {project.unreadNotifications > 0 ? '🔔 ' : ''}
                    {project.status.label}
                    {project.unreadNotifications > 0
                      ? ` (${project.unreadNotifications} ulest${project.unreadNotifications > 1 ? 'e' : ''})`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-dl customer-project-open"
                  onClick={() => router.push(`/app/customer/projects/${project.id}`)}
                >
                  Åpne
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
