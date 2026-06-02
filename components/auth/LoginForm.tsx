'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

type Mode = 'login' | 'signup';

type Props = {
  redirectTo?: string;
  embedded?: boolean;
};

export function LoginForm({ redirectTo = '/app/new', embedded = false }: Props) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password, fullName);
        if (needsConfirmation) {
          setError('Konto opprettet. Sjekk e-post for bekreftelse, deretter logg inn.');
          setMode('login');
          return;
        }
      } else {
        await signIn(email, password);
      }
      router.push(redirectTo);
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
      <h3>{mode === 'signup' ? 'Opprett konto' : 'Logg inn'}</h3>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="auth-field">
            <label htmlFor="auth-name">Fullt navn</label>
            <input
              id="auth-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
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
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
        <div className="auth-error">{error}</div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Venter...' : mode === 'signup' ? 'Registrer' : 'Logg inn'}
        </button>
      </form>
      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setMode(mode === 'signup' ? 'login' : 'signup');
          setError('');
        }}
      >
        {mode === 'signup' ? 'Har du konto? Logg inn' : 'Ny bruker? Opprett konto'}
      </button>
    </div>
  );

  if (embedded) return box;

  return (
    <div className="login-page">
      {box}
    </div>
  );
}
