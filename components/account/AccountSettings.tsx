'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { SettingsSection } from '@/components/settings/SettingsSection';
import type { UserContext } from '@/lib/user-context/types';
import { formatSupabaseError } from '@/lib/supabaseError';

export function AccountSettings() {
  const router = useRouter();
  const { user, profile, signOut, signOutGlobal } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [contextsLoading, setContextsLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const [globalLogoutBusy, setGlobalLogoutBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/user/contexts')
      .then((res) => (res.ok ? res.json() : { contexts: [] }))
      .then((json: { contexts?: UserContext[] }) => {
        setContexts(json.contexts ?? []);
      })
      .finally(() => setContextsLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Nytt passord må være minst 6 tegn.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passordene stemmer ikke overens.');
      return;
    }

    setPasswordBusy(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('Nåværende passord er feil.');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setPasswordSuccess('Passordet er endret. Du blir logget ut…');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setPasswordError(formatSupabaseError(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setEmailError('Skriv inn en gyldig e-postadresse.');
      return;
    }

    setEmailBusy(true);
    try {
      // Endring av e-postdomene flytter ikke bruker til annen customer_organization
      // (bevisst forenkling — kan adresseres senere ved behov).
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;

      setEmailSuccess(
        'Vi har sendt en bekreftelseslenke til din nye e-postadresse. E-postadressen endres ikke før du bekrefter.'
      );
      setNewEmail('');
    } catch (err) {
      setEmailError(formatSupabaseError(err));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleGlobalSignOut() {
    setGlobalLogoutBusy(true);
    try {
      await signOutGlobal();
      router.push('/');
      router.refresh();
    } finally {
      setGlobalLogoutBusy(false);
    }
  }

  return (
    <div className="account-settings">
      <SettingsSection title="Kontoinformasjon" description="Grunnleggende info om kontoen din.">
        <dl className="account-info-grid">
          <div>
            <dt>Navn</dt>
            <dd>{profile?.full_name || '—'}</dd>
          </div>
          <div>
            <dt>E-post</dt>
            <dd>{user?.email || '—'}</dd>
          </div>
        </dl>
        {!contextsLoading && contexts.length > 0 ? (
          <div className="account-contexts">
            <h3 className="account-contexts-title">Tilknyttede kontekster</h3>
            <ul className="account-contexts-list">
              {contexts.map((ctx) => (
                <li key={`${ctx.type}-${ctx.id}`}>
                  <span className="account-context-type">
                    {ctx.type === 'customer' ? 'Kunde' : 'Leverandør'}
                  </span>
                  {' — '}
                  {ctx.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Endre passord"
        description="Du må oppgi nåværende passord for å bekrefte identiteten din."
      >
        <form className="account-form" onSubmit={handleChangePassword}>
          <div className="auth-field">
            <label htmlFor="current-password">Nåværende passord</label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="form-input"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="account-new-password">Nytt passord</label>
            <input
              id="account-new-password"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="form-input"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="account-confirm-password">Bekreft nytt passord</label>
            <input
              id="account-confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="form-input"
            />
          </div>
          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          {passwordSuccess ? <p className="form-info">{passwordSuccess}</p> : null}
          <button type="submit" className="btn-generate" disabled={passwordBusy}>
            {passwordBusy ? 'Lagrer…' : 'Lagre nytt passord'}
          </button>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Endre e-postadresse"
        description="Bekreftelse sendes til både gammel og ny e-post."
      >
        <form className="account-form" onSubmit={handleChangeEmail}>
          <div className="auth-field">
            <label htmlFor="new-email">Ny e-postadresse</label>
            <input
              id="new-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              className="form-input"
            />
          </div>
          {emailError ? <p className="form-error">{emailError}</p> : null}
          {emailSuccess ? <p className="form-info">{emailSuccess}</p> : null}
          <button type="submit" className="btn-dl" disabled={emailBusy}>
            {emailBusy ? 'Sender…' : 'Be om e-postendring'}
          </button>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Sikkerhet"
        description="Logg ut av alle enheter hvis du tror kontoen kan være kompromittert."
      >
        <button
          type="button"
          className="btn-cancel"
          disabled={globalLogoutBusy}
          onClick={() => void handleGlobalSignOut()}
        >
          {globalLogoutBusy ? 'Logger ut…' : 'Logg ut av alle enheter'}
        </button>
      </SettingsSection>
    </div>
  );
}
