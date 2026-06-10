'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

type Preview = {
  companyName: string;
  roleLabel: string;
  inviterName: string;
  expiresAt: string;
  email: string;
};

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    void fetch(`/api/team/invitation?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json: { preview?: Preview; error?: string }) => {
        if (json.preview) setPreview(json.preview);
        else setError(json.error ?? 'Ugyldig invitasjon');
      });
  }, [token]);

  async function acceptInvitation() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke akseptere');
      router.push('/app/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feil');
    } finally {
      setAccepting(false);
    }
  }

  if (!preview && !error) {
    return (
      <div className="invite-page">
        <p className="form-info">Laster invitasjon…</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <h1>Invitasjon ugyldig</h1>
          <p className="form-error">{error}</p>
          <Link href="/login" className="btn-dl">
            Gå til innlogging
          </Link>
        </div>
      </div>
    );
  }

  const expires = new Date(preview!.expiresAt).toLocaleDateString('nb-NO');

  return (
    <div className="invite-page">
      <div className="invite-card">
        <h1>Bli med i {preview!.companyName}?</h1>
        <p className="form-info">
          {preview!.inviterName} har invitert deg som <strong>{preview!.roleLabel}</strong>{' '}
          på Samsiq.
        </p>
        <p className="form-card-hint">
          Invitasjonen gjelder for {preview!.email} og utløper {expires}.
        </p>

        {error ? <p className="form-error">{error}</p> : null}

        {!authLoading && !user ? (
          <div className="invite-actions">
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="btn-generate"
            >
              Logg inn med eksisterende konto
            </Link>
            <Link href={`/login?redirect=/invite/${token}`} className="btn-dl">
              Opprett ny konto
            </Link>
          </div>
        ) : null}

        {user ? (
          <div className="invite-actions">
            <button
              type="button"
              className="btn-generate"
              disabled={accepting}
              onClick={() => void acceptInvitation()}
            >
              {accepting ? 'Kobler til…' : 'Aksepter invitasjon'}
            </button>
            <p className="form-card-hint">Innlogget som {user.email}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
