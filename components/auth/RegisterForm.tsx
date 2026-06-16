'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { completeSessionAfterAuth } from '@/lib/auth/completeSessionClient';

type AccountType = 'supplier' | 'customer';

type Step = 'choose' | 'form';

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) return;
    setError('');
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp(email, password, fullName, {
        accountType,
      });
      if (needsConfirmation) {
        setError('Konto opprettet. Sjekk e-post for bekreftelse, deretter logg inn.');
        return;
      }

      const { redirectTo } = await completeSessionAfterAuth({
        accountType,
        forceCustomerLink: accountType === 'customer',
        fullName,
      });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering feilet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-box login-wrap auth-box--wide">
        <Link href="/" className="auth-close" aria-label="Tilbake">
          ×
        </Link>

        {step === 'choose' ? (
          <>
            <h3>Opprett konto</h3>
            <p className="auth-lead">Hvordan skal du bruke Samsiq?</p>
            <div className="onboarding-choice-grid register-role-grid">
              <button
                type="button"
                className="onboarding-choice"
                onClick={() => {
                  setAccountType('supplier');
                  setStep('form');
                }}
              >
                <span className="onboarding-choice-icon" aria-hidden>
                  🏭
                </span>
                <h3>Jeg er leverandør</h3>
                <p>
                  Jeg skal lage og administrere CE-dokumentasjon for mine produkter
                </p>
              </button>
              <button
                type="button"
                className="onboarding-choice onboarding-choice--featured"
                onClick={() => {
                  setAccountType('customer');
                  setStep('form');
                }}
              >
                <span className="onboarding-choice-icon" aria-hidden>
                  📋
                </span>
                <h3>Jeg har fått tilgang til dokumentasjon</h3>
                <p>
                  Jeg er kunde og skal gjennomgå og signere dokumentasjon fra en
                  leverandør
                </p>
              </button>
            </div>
            <p className="auth-footer-link">
              Har du konto? <Link href="/login">Logg inn</Link>
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setStep('choose');
                setError('');
              }}
            >
              ← Tilbake til rollevalg
            </button>
            <h3>
              {accountType === 'customer' ? 'Registrer som kunde' : 'Registrer som leverandør'}
            </h3>
            <p className="auth-lead">
              {accountType === 'customer'
                ? 'Gratis tilgang — ingen abonnement eller bedriftsoppsett.'
                : 'Du settes opp med bedriftsprofil og prøveperiode etter registrering.'}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="register-name">Fullt navn</label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="register-email">E-post</label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="register-password">Passord</label>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-error">{error}</div>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Oppretter konto…' : 'Opprett konto'}
              </button>
            </form>
            <p className="auth-footer-link">
              Har du konto? <Link href="/login">Logg inn</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
