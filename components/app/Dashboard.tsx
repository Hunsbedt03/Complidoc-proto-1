'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { createClient } from '@/lib/supabase/client';
import { getLocalProject, listLocalProjects } from '@/lib/localProjects';
import { rebuildZipFromDocs } from '@/lib/rebuildZip';
import { debugClientLog } from '@/lib/debugClientLog';
import { formatSupabaseError } from '@/lib/supabaseError';
import { formatDate, loadProjectZip, loadProjects } from '@/lib/projects';
import type { ProsjektSummary } from '@/lib/types';

type DashboardProps = {
  initialCloudProjects?: ProsjektSummary[];
  initialLoadError?: string | null;
};

export function Dashboard({
  initialCloudProjects = [],
  initialLoadError = null,
}: DashboardProps) {
  const router = useRouter();
  const { user, loading, projects, projectsError, hydrateCloudProjects } = useAuth();
  const { setZipFromProject } = useGeneration();
  const supabase = createClient();

  const [localProjects, setLocalProjects] = useState<ReturnType<typeof listLocalProjects>>(
    []
  );
  const [directCloud, setDirectCloud] = useState<ProsjektSummary[]>(initialCloudProjects);
  const [directLoadError, setDirectLoadError] = useState<string | null>(initialLoadError);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    setLocalProjects(listLocalProjects());
    if (initialCloudProjects.length) {
      setDirectCloud(initialCloudProjects);
      hydrateCloudProjects(initialCloudProjects);
      debugClientLog(
        'Dashboard.tsx:hydrate',
        'SSR hydrate',
        { ssrCount: initialCloudProjects.length },
        'H-SSR'
      );
    }
  }, [initialCloudProjects, hydrateCloudProjects]);

  useEffect(() => {
    if (!user) {
      setDirectCloud(initialCloudProjects);
      setDirectLoadError(null);
      return;
    }

    let cancelled = false;
    setDirectLoading(true);

    void (async () => {
      const {
        data: { user: verified },
        error: authErr,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authErr || !verified) {
        setDirectLoadError(authErr ? formatSupabaseError(authErr) : 'Ikke innlogget');
        setDirectLoading(false);
        debugClientLog(
          'Dashboard.tsx:directLoad',
          'getUser failed',
          { error: authErr ? formatSupabaseError(authErr) : 'no user' },
          'H-session'
        );
        return;
      }

      const probeRes = await fetch('/api/debug/dashboard-probe', {
        credentials: 'include',
        cache: 'no-store',
      });
      const probe = await probeRes.json().catch(() => ({}));
      debugClientLog(
        'Dashboard.tsx:probe',
        'server cookie probe',
        {
          status: probeRes.status,
          hasUser: probe?.hasUser,
          count: probe?.count,
          email: probe?.email ?? null,
          loadError: probe?.loadError ?? null,
        },
        'H-probe'
      );

      try {
        const cloud = await loadProjects(supabase, verified.id);
        if (cancelled) return;
        setDirectCloud(cloud);
        setDirectLoadError(null);
        hydrateCloudProjects(cloud);
        debugClientLog(
          'Dashboard.tsx:directLoad',
          'direct loadProjects ok',
          {
            count: cloud.length,
            email: verified.email ?? null,
            userId: verified.id,
            serverCount: typeof probe?.count === 'number' ? probe.count : null,
          },
          'H-client'
        );
      } catch (err) {
        if (cancelled) return;
        const msg = formatSupabaseError(err);
        setDirectLoadError(msg);
        debugClientLog(
          'Dashboard.tsx:directLoad',
          'direct loadProjects failed',
          { error: msg, email: verified.email ?? null, serverCount: probe?.count ?? null },
          'H-client'
        );
      } finally {
        if (!cancelled) setDirectLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, supabase, initialCloudProjects, hydrateCloudProjects]);

  const displayProjects = useMemo(() => {
    const byId = new Map<string, ProsjektSummary>();
    for (const p of initialCloudProjects) byId.set(p.id, p);
    for (const p of directCloud) byId.set(p.id, p);
    for (const p of projects) byId.set(p.id, p);
    for (const lp of localProjects) {
      if (!byId.has(lp.id)) byId.set(lp.id, lp);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [projects, initialCloudProjects, directCloud, localProjects]);

  const showLoadError = projectsError || directLoadError || initialLoadError;

  async function openProject(projectId: string) {
    const local = getLocalProject(projectId);
    if (local) {
      const zip = await rebuildZipFromDocs(local.payload.documents, local.payload.zipFilename);
      setZipFromProject(zip, local.payload.prosjekt);
      router.push('/app/output');
      return;
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) return;

    const loaded = await loadProjectZip(supabase, currentUser.id, projectId);
    if (!loaded) {
      alert('Fant ikke prosjektet.');
      return;
    }

    setZipFromProject({ zip: loaded.zip, filename: loaded.filename }, loaded.title);
    router.push('/app/output');
  }

  const count = displayProjects.length;

  useEffect(() => {
    if (loading) return;
    debugClientLog(
      'Dashboard.tsx:display',
      'display project count',
      {
        count,
        ssr: initialCloudProjects.length,
        direct: directCloud.length,
        auth: projects.length,
        local: localProjects.length,
        hasUser: !!user,
      },
      'H-merge'
    );
  }, [
    loading,
    directLoading,
    count,
    initialCloudProjects.length,
    directCloud.length,
    projects.length,
    localProjects.length,
    user,
  ]);

  if ((loading || directLoading) && !displayProjects.length) {
    return (
      <p style={{ color: '#9CA3AF', fontSize: 14 }}>Laster prosjekter…</p>
    );
  }

  return (
    <>
      {!user && !initialCloudProjects.length && (
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
                Ingen prosjekter funnet for innlogget bruker ({user.email}). Opprett et nytt
                prosjekt eller sjekk at du er logget inn med riktig konto.
              </p>
            )}
            <Link href="/app/new" className="proj-card">
              <div className="proj-icon">+</div>
              <div>
                <div className="proj-name">Ingen prosjekter ennå</div>
                <div className="proj-meta">Opprett ditt første prosjekt</div>
              </div>
              <span className="badge badge-new">Ny</span>
            </Link>
          </>
        )}
        {displayProjects.map((p) => (
          <button
            key={p.id}
            type="button"
            className="proj-card"
            onClick={() => openProject(p.id)}
          >
            <div className="proj-icon">📄</div>
            <div>
              <div className="proj-name">{p.navn}</div>
              <div className="proj-meta">
                {(p.produsent || '—') + ' · ' + formatDate(p.created_at)}
              </div>
            </div>
            <span className={'badge ' + (p.status === 'fullført' ? 'badge-done' : 'badge-prog')}>
              {p.status}
            </span>
          </button>
        ))}
        {displayProjects.length > 0 && (
          <Link href="/app/new" className="proj-card">
            <div className="proj-icon">+</div>
            <div>
              <div className="proj-name">+ Opprett nytt prosjekt</div>
              <div className="proj-meta">Klikk for å starte</div>
            </div>
            <span className="badge badge-new">Ny</span>
          </Link>
        )}
      </div>
    </>
  );
}
