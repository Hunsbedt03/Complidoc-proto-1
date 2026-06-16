'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { completeSessionAfterAuth } from '@/lib/auth/completeSessionClient';

type Props = {
  redirectTo?: string;
  embedded?: boolean;
};

export function LoginForm({ redirectTo, embedded = false }: Props) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      const { redirectTo: resolved } = await completeSessionAfterAuth({});
      router.push(redirectTo && redirectTo !== '/app/new' ? redirectTo : resolved);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Innlogging feilet');
    } finally {
      setSubmitting(false);
    }
  }

  const box = (
    <div className={embedded ? 'auth-box' : 'auth-box login-wrap'}>
      {!embedded && (
        <Link href="/" className="auth-close" aria-label="Tilbake">
          ×
        </Link>
      )}
      <h3>Logg inn</h3>
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="auth-email">E-post</label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="auth-password">Passord</label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="auth-error">{error}</div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Venter...' : 'Logg inn'}
        </button>
      </form>
      <p className="auth-footer-link">
        Ny bruker? <Link href="/app/register">Opprett konto</Link>
      </p>
    </div>
  );

  if (embedded) return box;

  return <div className="login-page">{box}</div>;
}
