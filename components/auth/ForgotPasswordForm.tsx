'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { authCallbackUrl } from '@/lib/appUrl';
import { formatSupabaseError } from '@/lib/supabaseError';

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: authCallbackUrl('/reset-password') }
      );
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-box login-wrap">
        <Link href="/login" className="auth-close" aria-label="Tilbake">
          ×
        </Link>
        <h3>Glemt passord</h3>
        {submitted ? (
          <p className="form-info auth-success-msg">
            Hvis denne e-postadressen er registrert, har vi sendt en lenke for å
            tilbakestille passordet.
          </p>
        ) : (
          <>
            <p className="auth-lead">
              Skriv inn e-postadressen din, så sender vi en lenke for å sette et
              nytt passord.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="forgot-email">E-post</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="auth-error">{error}</div>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Sender…' : 'Send tilbakestillingslenke'}
              </button>
            </form>
          </>
        )}
        <p className="auth-footer-link">
          <Link href="/login">Tilbake til innlogging</Link>
        </p>
      </div>
    </div>
  );
}
