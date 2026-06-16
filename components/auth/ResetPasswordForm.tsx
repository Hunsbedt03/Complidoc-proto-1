'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatSupabaseError } from '@/lib/supabaseError';

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setHasSession(true);
        setReady(true);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasSession(true);
          setReady(true);
        }
      });
      unsub = () => listener.subscription.unsubscribe();

      window.setTimeout(async () => {
        if (cancelled) return;
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session) setHasSession(true);
        setReady(true);
      }, 400);
    }

    void init();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [supabase]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn.');
      return;
    }
    if (password !== confirm) {
      setError('Passordene stemmer ikke overens.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="login-page">
        <div className="auth-box login-wrap">
          <p className="auth-lead">Laster…</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="login-page">
        <div className="auth-box login-wrap">
          <h3>Lenken er ugyldig eller utløpt</h3>
          <p className="auth-lead">
            Be om en ny tilbakestillingslenke og prøv igjen.
          </p>
          <p className="auth-footer-link">
            <Link href="/forgot-password">Be om ny lenke</Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="auth-box login-wrap">
          <h3>Passord oppdatert</h3>
          <p className="form-info auth-success-msg">
            Passordet ditt er endret. Du blir sendt til innlogging om et øyeblikk.
          </p>
          <p className="auth-footer-link">
            <Link href="/login">Gå til innlogging nå</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="auth-box login-wrap">
        <h3>Sett nytt passord</h3>
        <p className="auth-lead">Velg et nytt passord for kontoen din.</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="new-password">Nytt passord</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-password">Bekreft nytt passord</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-error">{error}</div>
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Lagrer…' : 'Lagre nytt passord'}
          </button>
        </form>
      </div>
    </div>
  );
}
