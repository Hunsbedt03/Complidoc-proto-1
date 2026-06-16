'use client';

import { useCallback, useEffect, useState } from 'react';

type RevisionState = {
  canSignAndSend: boolean;
  canReopenRevision: boolean;
  revisionLocked: boolean;
  statusMessage: string;
  openCycle: { cycle_number: number } | null;
  latestFullySigned: { cycle_number: number; customer_signed_at: string | null } | null;
};

type Props = {
  projectId: string;
  projectName: string;
  onRevisionLockedChange?: (locked: boolean) => void;
};

export function ProjectRevisionPanel({
  projectId,
  projectName,
  onRevisionLockedChange,
}: Props) {
  const [state, setState] = useState<RevisionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/revision-state`);
      const json = (await res.json()) as RevisionState & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste signering');
      setState(json);
      onRevisionLockedChange?.(json.revisionLocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste signering');
    } finally {
      setLoading(false);
    }
  }, [projectId, onRevisionLockedChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSignAndSend() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/sign-and-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Signering feilet');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signering feilet');
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/reopen-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason, projectName }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke starte revisjon');
      setShowReopen(false);
      setReopenReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke starte revisjon');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="revision-panel">
        <p className="customer-access-empty">Laster signering…</p>
      </section>
    );
  }

  if (!state) return null;

  return (
    <section className="revision-panel">
      <h3 className="customer-access-title">Kundesignering</h3>
      <p
        className={
          'revision-status-msg' + (state.revisionLocked ? ' revision-status-msg--locked' : '')
        }
      >
        {state.statusMessage}
      </p>
      {error ? <p className="form-error">{error}</p> : null}

      {state.canSignAndSend ? (
        <button
          type="button"
          className="btn-generate"
          disabled={busy}
          onClick={() => void handleSignAndSend()}
        >
          {busy ? 'Signerer…' : 'Signer og send til kunde'}
        </button>
      ) : null}

      {state.canReopenRevision ? (
        <>
          {!showReopen ? (
            <button
              type="button"
              className="btn-cancel revision-reopen-btn"
              onClick={() => setShowReopen(true)}
            >
              Lås opp for revisjon
            </button>
          ) : (
            <form className="revision-reopen-form" onSubmit={handleReopen}>
              <label htmlFor="reopen-reason">Årsak til revisjon</label>
              <textarea
                id="reopen-reason"
                required
                minLength={3}
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="form-input"
              />
              <div className="revision-reopen-actions">
                <button type="submit" className="btn-generate" disabled={busy}>
                  Start revisjon
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowReopen(false)}
                >
                  Avbryt
                </button>
              </div>
            </form>
          )}
        </>
      ) : null}

      {state.revisionLocked ? (
        <p className="form-info revision-lock-hint">
          Dokumenter er låst mens du venter på kundens akseptanse. Start en revisjon
          etter full signering for å gjøre endringer.
        </p>
      ) : null}
    </section>
  );
}
