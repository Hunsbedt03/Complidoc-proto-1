'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ROLE_LABELS, type TeamRole } from '@/lib/auth/permissions';
import type { TeamInvitation, TeamMember } from '@/lib/team/types';
import { useAuth } from '@/components/providers/AuthProvider';

function initials(name: string | null | undefined, email: string): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO');
}

function RoleBadge({ role }: { role: TeamRole }) {
  return <span className={`team-role-badge team-role-badge--${role}`}>{ROLE_LABELS[role]}</span>;
}

type TeamPayload = {
  members: TeamMember[];
  invitations: TeamInvitation[];
  permissions: { invite?: boolean; remove?: boolean };
  teamLimit: { allowed: boolean; limit: number; count: number; plan: string } | null;
};

export function TeamSettings() {
  const { user } = useAuth();
  const [data, setData] = useState<TeamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('engineer');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      const json = (await res.json()) as TeamPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke hente team');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feil ved lasting');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite() {
    setError(null);
    setInviteLink(null);
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = (await res.json()) as {
        error?: string;
        invitationUrl?: string;
        emailSent?: boolean;
        emailReason?: string | null;
        resendStatus?: number | null;
      };
      if (!res.ok) throw new Error(json.error ?? 'Invitasjon feilet');
      setInviteEmail('');
      if (!json.emailSent && json.invitationUrl) {
        setInviteLink(json.invitationUrl);
        if (json.emailReason === 'email_not_configured') {
          setError(
            'E-post er ikke konfigurert. Legg RESEND_API_KEY og RESEND_FROM_EMAIL (eller INVITE_EMAIL_FROM) i .env.local og start serveren på nytt.'
          );
        } else if (json.emailReason === 'resend_error' || json.emailReason === 'send_failed') {
          setError(
            `E-post kunne ikke sendes${json.resendStatus ? ` (Resend ${json.resendStatus})` : ''}. Del invitasjonslenken manuelt.`
          );
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invitasjon feilet');
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(memberId: string, role: TeamRole) {
    const res = await fetch('/api/team/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? 'Kunne ikke oppdatere rolle');
      return;
    }
    await load();
  }

  async function removeMember(memberId: string) {
    if (!confirm('Fjerne dette medlemmet fra teamet?')) return;
    const res = await fetch('/api/team/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? 'Kunne ikke fjerne medlem');
      return;
    }
    await load();
  }

  async function revokeInvitation(invitationId: string) {
    const res = await fetch('/api/team/invitations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId }),
    });
    if (!res.ok) return;
    await load();
  }

  const canInvite = data?.permissions?.invite ?? false;
  const canManage = data?.permissions?.remove ?? false;
  const limit = data?.teamLimit;

  return (
    <SettingsSection
      id="team"
      title="Team"
      description="Administrer hvem som har tilgang til bedriftskontoen."
    >
      {loading ? <p className="form-info">Laster team…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {limit ? (
        <p className="form-card-hint">
          {limit.count} / {limit.limit === Infinity ? '∞' : limit.limit} brukere (
          {limit.plan === 'pro' ? 'Pro' : limit.plan === 'starter' ? 'Starter' : limit.plan})
          {!limit.allowed ? (
            <>
              {' '}
              — grensen er nådd.{' '}
              <Link href="/priser">Oppgrader plan</Link> for flere brukere.
            </>
          ) : null}
        </p>
      ) : null}

      <div className="team-member-list">
        {(data?.members ?? []).map((member) => (
          <div key={member.id} className="team-member-row">
            <div className="team-member-main">
              <span className="team-avatar" aria-hidden>
                {initials(member.fullName, member.email)}
              </span>
              <div>
                <p className="team-member-name">
                  {member.fullName || member.email}
                  {member.userId === user?.id ? (
                    <span className="team-member-you"> (deg)</span>
                  ) : null}
                </p>
                <p className="team-member-email">{member.email}</p>
                <p className="team-member-meta">
                  Sist aktiv: {formatDate(member.lastActiveAt)}
                </p>
              </div>
            </div>
            <div className="team-member-actions">
              <RoleBadge role={member.role} />
              {canManage && member.role !== 'owner' ? (
                <>
                  <select
                    className="form-input team-role-select"
                    value={member.role}
                    onChange={(e) =>
                      void updateRole(member.id, e.target.value as TeamRole)
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="engineer">Ingeniør</option>
                    <option value="viewer">Leser</option>
                  </select>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => void removeMember(member.id)}
                  >
                    Fjern
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {canInvite && limit?.allowed !== false ? (
        <div className="team-invite-form">
          <div className="team-invite-row">
            <input
              type="email"
              className="form-input"
              placeholder="kollega@bedrift.no"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="form-input team-role-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
            >
              <option value="admin">Admin</option>
              <option value="engineer">Ingeniør</option>
              <option value="viewer">Leser</option>
            </select>
            <button
              type="button"
              className="btn-dl"
              disabled={inviting || !inviteEmail.trim()}
              onClick={() => void sendInvite()}
            >
              {inviting ? 'Sender…' : 'Send invitasjon'}
            </button>
          </div>
          {inviteLink ? (
            <p className="form-card-hint">
              E-post ikke konfigurert — del denne lenken:{' '}
              <a href={inviteLink} className="team-invite-link">
                {inviteLink}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {(data?.invitations ?? []).length > 0 ? (
        <div className="team-pending">
          <h3 className="team-pending-title">Ventende invitasjoner</h3>
          <ul className="team-pending-list">
            {data!.invitations.map((inv) => (
              <li key={inv.id} className="team-pending-row">
                <span>
                  {inv.email} · {ROLE_LABELS[inv.role]} · utløper{' '}
                  {formatDate(inv.expiresAt)}
                </span>
                {canInvite ? (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => void revokeInvitation(inv.id)}
                  >
                    Trekk tilbake
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SettingsSection>
  );
}
