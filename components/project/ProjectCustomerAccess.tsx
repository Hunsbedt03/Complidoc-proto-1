'use client';

import { useCallback, useEffect, useState } from 'react';

type AccessRow = {
  id: string;
  invited_email: string;
  status: 'pending' | 'active' | 'revoked';
  invited_at: string;
  activated_at: string | null;
  organization_name?: string | null;
};

type Props = {
  projectId: string;
  projectName: string;
};

export function ProjectCustomerAccess({ projectId, projectName }: Props) {
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/customer-access`);
      const json = (await res.json()) as { access?: AccessRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste kunder');
      setAccess(json.access ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste kunder');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/customer-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, projectName }),
      });
      const json = (await res.json()) as { error?: string; emailSent?: boolean };
      if (!res.ok) throw new Error(json.error ?? 'Invitasjon feilet');
      setEmail('');
      setMessage(
        json.emailSent
          ? 'Invitasjon sendt på e-post.'
          : 'Tilgang opprettet. E-post ble ikke sendt (sjekk Resend-oppsett).'
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitasjon feilet');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(accessId: string) {
    if (!confirm('Fjerne tilgang for denne kunden?')) return;
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/customer-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId, action: 'revoke' }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke fjerne tilgang');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke fjerne tilgang');
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('nb-NO');
    } catch {
      return iso;
    }
  }

  return (
    <section className="customer-access-panel">
      <h3 className="customer-access-title">Kunder med tilgang</h3>
      <p className="customer-access-lead">
        Inviter kundens kontaktpersoner. De får tilgang når de registrerer seg med
        invitert e-post.
      </p>

      <form className="customer-access-invite" onSubmit={handleInvite}>
        <input
          type="email"
          required
          placeholder="kunde@firma.no"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
        />
        <button type="submit" className="btn-dl" disabled={inviting}>
          {inviting ? 'Sender…' : '+ Inviter kunde'}
        </button>
      </form>

      {message ? <p className="form-info">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <p className="customer-access-empty">Laster…</p>
      ) : access.length === 0 ? (
        <p className="customer-access-empty">Ingen kunder invitert ennå.</p>
      ) : (
        <ul className="customer-access-list">
          {access.map((row) => (
            <li key={row.id} className="customer-access-row">
              <div>
                <strong>{row.invited_email}</strong>
                {row.organization_name ? (
                  <span className="customer-access-org"> · {row.organization_name}</span>
                ) : null}
                <div className="customer-access-meta">
                  Status: {row.status === 'active' ? 'Aktiv' : 'Venter på registrering'}
                  {' · '}
                  Invitert {formatDate(row.invited_at)}
                  {row.activated_at ? ` · Aktivert ${formatDate(row.activated_at)}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn-cancel customer-access-revoke"
                onClick={() => void handleRevoke(row.id)}
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
