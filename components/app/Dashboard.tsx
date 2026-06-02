'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { createClient } from '@/lib/supabase/client';
import { formatDate, loadProjectZip } from '@/lib/projects';

export function Dashboard() {
  const router = useRouter();
  const { projects } = useAuth();
  const { setZipFromProject } = useGeneration();
  const supabase = createClient();

  async function openProject(projectId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const loaded = await loadProjectZip(supabase, user.id, projectId);
    if (!loaded) {
      alert('Fant ikke prosjektet.');
      return;
    }

    setZipFromProject({ zip: loaded.zip, filename: loaded.filename }, loaded.title);
    router.push('/app/output');
  }

  const count = projects.length;

  return (
    <>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Denne måneden
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Pakker generert</div>
          <div className="stat-val" id="stat-packages">
            {count}
          </div>
          <div className="stat-sub">Lagret i skyen</div>
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
        {!projects.length && (
          <Link href="/app/new" className="proj-card">
            <div className="proj-icon">+</div>
            <div>
              <div className="proj-name">Ingen prosjekter ennå</div>
              <div className="proj-meta">Opprett ditt første prosjekt</div>
            </div>
            <span className="badge badge-new">Ny</span>
          </Link>
        )}
        {projects.map((p) => (
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
        {projects.length > 0 && (
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
