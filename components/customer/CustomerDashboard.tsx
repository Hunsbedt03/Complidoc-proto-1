'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  formatLocation,
  mapProjectStatusBadge,
  type CommandCenterSupplierGroup,
} from '@/lib/customer-portal/commandCenter';

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function CustomerDashboard() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [suppliers, setSuppliers] = useState<CommandCenterSupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/customer/projects')
      .then(async (res) => {
        const json = (await res.json()) as {
          organizationName?: string;
          suppliers?: CommandCenterSupplierGroup[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste oversikten');
        setOrganizationName(json.organizationName ?? 'Kunde');
        setSuppliers(json.suppliers ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Kunne ikke laste oversikten');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="customer-empty">Laster oversikt…</p>;
  }

  if (error) {
    return <p className="customer-empty customer-empty--error">{error}</p>;
  }

  return (
    <div className="customer-dashboard command-center">
      <header className="customer-dashboard-header">
        <div>
          <p className="customer-dashboard-kicker">Command Center</p>
          <h1 className="customer-dashboard-title">{organizationName}</h1>
          <p className="command-center-lead">
            Samlet oversikt over prosjekter fra leverandører
          </p>
        </div>
      </header>

      {suppliers.length === 0 ? (
        <div className="customer-empty-card">
          <p className="customer-empty-title">Ingen delte prosjekter ennå</p>
          <p className="customer-empty-text">
            Når en leverandør inviterer deg til et prosjekt, vises det her automatisk —
            gruppert per leverandør.
          </p>
        </div>
      ) : (
        <div className="command-center-supplier-list">
          {suppliers.map((supplier) => {
            const location = formatLocation(supplier.city, supplier.country);
            return (
              <section
                key={supplier.supplierId}
                className="command-center-supplier-card"
              >
                <header className="command-center-supplier-head">
                  <div className="command-center-supplier-identity">
                    {supplier.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={supplier.logoUrl}
                        alt=""
                        className="command-center-supplier-logo"
                      />
                    ) : (
                      <div className="command-center-supplier-logo-fallback" aria-hidden>
                        {supplier.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="command-center-supplier-name">{supplier.name}</h2>
                      {location ? (
                        <p className="command-center-supplier-meta">{location}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="command-center-supplier-count">
                    {supplier.projectCount}{' '}
                    {supplier.projectCount === 1 ? 'prosjekt' : 'prosjekter'}
                  </p>
                </header>

                <ul className="command-center-project-list">
                  {supplier.projects.map((project) => {
                    const badge = mapProjectStatusBadge(project.status);
                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          className="command-center-project-row"
                          onClick={() =>
                            router.push(`/app/customer/projects/${project.id}`)
                          }
                        >
                          <span className="command-center-project-name">
                            {project.name}
                          </span>
                          <span className={badge.className}>{badge.label}</span>
                          <span className="command-center-project-date">
                            {formatUpdatedAt(project.updatedAt)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
