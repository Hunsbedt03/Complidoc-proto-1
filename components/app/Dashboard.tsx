'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CompletenessBar } from '@/components/CompletenessIndicator';
import { ArchiveWarningBanner } from '@/components/archive/ArchiveWarningBanner';
import { CertificationExpiryBanner } from '@/components/settings/CertificationExpiryBanner';
import { getExpiringCertifications } from '@/lib/companyProfile/extended';
import type { CompanyProfile } from '@/lib/types';
import {
  isSubscriptionActive,
  type SubscriptionBannerData,
} from '@/components/SubscriptionBanner';
import { useAuth } from '@/components/providers/AuthProvider';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { createClient } from '@/lib/supabase/client';
import { fetchSyncedArchiveLinks } from '@/lib/archive/clientSync';
import { restoreProjectArchiveLinks } from '@/lib/archive/restoreLinks';
import {
  getLocalProject,
  listLocalProjects,
  resolveStoredDocuments,
} from '@/lib/localProjects';
import { saveLocalProjectArchiveLinks } from '@/lib/localArchive';
import { rebuildZipFromDocs } from '@/lib/rebuildZip';
import { formatDate, loadProjectSession } from '@/lib/projects';
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/lib/projectStatus';
import { usePermissions } from '@/hooks/usePermissions';
import type { ProjectArchiveLink, ProsjektSummary } from '@/lib/types';

function workflowBadgeClass(status?: ProjectStatus): string {
  if (status === 'locked') return 'badge-done';
  if (status === 'review') return 'badge-review';
  return 'badge-draft';
}

export function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const { user, loading, projects, projectsError } = useAuth();
  const permissions = usePermissions();
  const { setZipFromProject } = useGeneration();
  const supabase = createClient();

  const [localProjects, setLocalProjects] = useState<ReturnType<typeof listLocalProjects>>(
    []
  );
  const [subscription, setSubscription] = useState<SubscriptionBannerData | null>(
    null
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(paymentSuccess);
  const [activationConfirmed, setActivationConfirmed] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const expiringCerts = useMemo(
    () => getExpiringCertifications(companyProfile?.certifications ?? []),
    [companyProfile?.certifications]
  );

  useEffect(() => {
    setLocalProjects(listLocalProjects());
  }, []);

  useEffect(() => {
    if (!user) {
      setCompanyProfile(null);
      return;
    }
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        setCompanyProfile(json?.profile ?? null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setPendingActivation(false);
      return;
    }

    let cancelled = false;

    async function loadStatus(
      syncFromStripe: boolean
    ): Promise<SubscriptionBannerData | null> {
      setSubscriptionLoading(true);
      try {
        const url = syncFromStripe
          ? '/api/subscription/sync'
          : '/api/subscription/status';
        const res = await fetch(url, {
          method: syncFromStripe ? 'POST' : 'GET',
        });
        if (!res.ok || cancelled) return null;
        const json = (await res.json()) as SubscriptionBannerData;
        if (cancelled) return null;
        setSubscription(json);
        return json;
      } catch {
        if (!cancelled) setSubscription(null);
        return null;
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    }

    function onActivated() {
      setActivationConfirmed(true);
      setPendingActivation(false);
      if (paymentSuccess) {
        router.replace('/app/dashboard');
      }
    }

    if (paymentSuccess) {
      setPendingActivation(true);
      void (async () => {
        for (let attempt = 0; attempt < 8; attempt++) {
          if (cancelled) return;
          const json = await loadStatus(true);
          if (json && isSubscriptionActive(json)) {
            onActivated();
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!cancelled) {
          setPendingActivation(false);
          const json = await loadStatus(false);
          if (json && isSubscriptionActive(json)) {
            onActivated();
          }
        }
      })();
    } else {
      void loadStatus(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user, paymentSuccess, router]);

  const displayProjects = useMemo(() => {
    const byId = new Map<string, ProsjektSummary>();
    for (const p of projects) byId.set(p.id, p);
    for (const lp of localProjects) {
      if (!byId.has(lp.id)) byId.set(lp.id, lp);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [projects, localProjects]);

  const showLoadError =
    !loading && displayProjects.length === 0 ? projectsError : null;

  async function openProject(projectId: string) {
    const local = getLocalProject(projectId);
    if (local) {
      const documents = resolveStoredDocuments(local.payload);
      const zip =
        local.payload.zipBase64?.length
          ? {
              zip: local.payload.zipBase64,
              filename: local.payload.zipFilename || 'Samsiq.zip',
            }
          : await rebuildZipFromDocs(
              documents,
              local.payload.zipFilename || 'Samsiq.zip'
            );

      let archiveLinks = restoreProjectArchiveLinks(
        local.id,
        local.payload,
        local.payload.archiveLinks,
        user?.id
      );
      const { links: synced } = await fetchSyncedArchiveLinks(
        local.id,
        local.payload
      );
      if (synced.length) {
        archiveLinks = synced;
      }
      if (archiveLinks.length) {
        saveLocalProjectArchiveLinks(local.id, archiveLinks);
      }

      setZipFromProject(zip, local.payload.prosjekt, {
        form: local.payload,
        documents,
        projectId: local.id,
        status: local.payload.workflowStatus ?? 'draft',
        uploads: local.payload.uploads ?? [],
        archiveLinks,
      });
      router.push('/app/output');
      return;
    }

    if (!user) return;

    const loaded = await loadProjectSession(supabase, user.id, projectId);
    if (!loaded) {
      setActionError('Fant ikke prosjektet.');
      return;
    }

    let archiveLinks: ProjectArchiveLink[] = [];
    if (loaded.form) {
      const { links: synced } = await fetchSyncedArchiveLinks(
        loaded.projectId,
        loaded.form
      );
      archiveLinks = synced.length
        ? synced
        : restoreProjectArchiveLinks(
            loaded.projectId,
            loaded.form,
            undefined,
            user.id
          );
    }

    setZipFromProject(
      { zip: loaded.zip, filename: loaded.filename },
      loaded.title,
      {
        form: loaded.form,
        documents: loaded.documents,
        projectId: loaded.projectId,
        status: loaded.workflowStatus,
        uploads: loaded.uploads,
        archiveLinks,
      }
    );
    router.push('/app/output');
  }

  const count = displayProjects.length;

  if (loading && !displayProjects.length) {
    return (
      <p style={{ color: '#9CA3AF', fontSize: 14 }}>Laster prosjekter…</p>
    );
  }

  return (
    <>
      <CertificationExpiryBanner expiringCerts={expiringCerts} />

      <ArchiveWarningBanner />

      {actionError ? <p className="form-error">{actionError}</p> : null}

      {activationConfirmed && !pendingActivation ? (
        <p
          style={{
            color: '#9FD66A',
            fontSize: 13,
            marginBottom: 16,
            padding: '10px 12px',
            background: 'rgba(97,153,34,0.1)',
            borderRadius: 8,
            border: '0.5px solid rgba(97,153,34,0.25)',
          }}
        >
          Abonnement aktivert — velkommen til Samsiq!
        </p>
      ) : null}

      {!user && !displayProjects.length && (
        <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>
          <Link href="/login?redirect=/app/dashboard" style={{ color: '#85B7EB' }}>
            Logg inn
          </Link>{' '}
          for å se prosjekter lagret i skyen. Lokale prosjekter vises under.
        </p>
      )}

      {showLoadError && (
        <p
          style={{
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 16,
            padding: '10px 12px',
            background: 'rgba(239,68,68,0.08)',
            borderRadius: 8,
            border: '0.5px solid rgba(239,68,68,0.25)',
          }}
        >
          Kunne ikke hente prosjekter fra Supabase: {showLoadError}
        </p>
      )}

      <div className="section-label" style={{ marginBottom: 10 }}>
        Denne måneden
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Pakker generert</div>
          <div className="stat-val" id="stat-packages">
            {count}
          </div>
          <div className="stat-sub">
            {user ? 'Fra databasen og lokalt' : 'Kun lokalt'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Timer spart (est.)</div>
          <div className="stat-val" id="stat-hours">
            {count * 4}t
          </div>
          <div className="stat-sub">4t per pakke</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aktive prosjekter</div>
          <div className="stat-val" id="stat-projects">
            {count}
          </div>
          <div className="stat-sub">Dine prosjekter</div>
        </div>
      </div>
      <div className="section-label" style={{ marginTop: 8 }}>
        Siste prosjekter
      </div>
      <div className="proj-list" id="proj-list">
        {!displayProjects.length && (
          <>
            {user && !showLoadError && (
              <p
                style={{
                  color: '#9CA3AF',
                  fontSize: 13,
                  marginBottom: 12,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                }}
              >
                Ingen prosjekter funnet for innlogget bruker ({user.email}). Opprett et
                nytt prosjekt eller sjekk at du er logget inn med riktig konto.
              </p>
            )}
            {permissions.createProject ? (
              <Link href="/app/new" className="proj-card">
                <div className="proj-icon">+</div>
                <div>
                  <div className="proj-name">Ingen prosjekter ennå</div>
                  <div className="proj-meta">Opprett ditt første prosjekt</div>
                </div>
                <span className="badge badge-new">Ny</span>
              </Link>
            ) : null}
          </>
        )}
        {displayProjects.map((p) => {
          const ws = p.workflowStatus;
          const badgeClass = ws
            ? workflowBadgeClass(ws)
            : p.status === 'Godkjent' || p.status === 'fullført'
              ? 'badge-done'
              : 'badge-prog';
          const badgeText = ws
            ? PROJECT_STATUS_LABELS[ws]
            : p.status;
          return (
            <button
              key={p.id}
              type="button"
              className="proj-card"
              onClick={() => openProject(p.id)}
            >
              <div className="proj-icon">📄</div>
              <div className="proj-card-body">
                <div className="proj-name">{p.navn}</div>
                <div className="proj-meta">
                  {(p.produsent || '—') + ' · ' + formatDate(p.created_at)}
                </div>
                {typeof p.completenessPercent === 'number' ? (
                  <CompletenessBar percent={p.completenessPercent} />
                ) : null}
              </div>
              <span className={'badge ' + badgeClass}>{badgeText}</span>
            </button>
          );
        })}
        {displayProjects.length > 0 && permissions.createProject ? (
          <Link href="/app/new" className="proj-card">
            <div className="proj-icon">+</div>
            <div>
              <div className="proj-name">+ Opprett nytt prosjekt</div>
              <div className="proj-meta">Klikk for å starte</div>
            </div>
            <span className="badge badge-new">Ny</span>
          </Link>
        ) : null}
      </div>
    </>
  );
}
