import 'server-only';

import type { TeamRole } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { resolveInviteEmailFrom, resolveResendApiKey } from './resendConfig';

type InvitationEmailInput = {
  to: string;
  inviterName: string;
  companyName: string;
  invitationUrl: string;
  role: TeamRole;
  expiresAt: string;
};

export type InvitationEmailResult = {
  sent: boolean;
  reason?:
    | 'email_not_configured'
    | 'send_failed'
    | 'resend_error';
  resendStatus?: number;
  resendError?: string;
};

export async function sendInvitationEmail(
  input: InvitationEmailInput
): Promise<InvitationEmailResult> {
  const apiKey = resolveResendApiKey();
  const from = resolveInviteEmailFrom();

  if (!apiKey) {
    console.warn(
      '[samsiq team] RESEND_API_KEY mangler — e-post sendes ikke. Legg til i .env.local og start dev-server på nytt.',
      { invitationUrl: input.invitationUrl }
    );
    return { sent: false, reason: 'email_not_configured' };
  }

  const expires = new Date(input.expiresAt).toLocaleDateString('nb-NO');
  const roleLabel = ROLE_LABELS[input.role];

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: `Invitasjon til ${input.companyName} på Samsiq`,
        html: `
        <p>Hei,</p>
        <p>${input.inviterName} har invitert deg til <strong>${input.companyName}</strong> på Samsiq som <strong>${roleLabel}</strong>.</p>
        <p><a href="${input.invitationUrl}">Aksepter invitasjonen</a></p>
        <p>Lenken utløper ${expires}.</p>
        <p>— Samsiq</p>
      `,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[samsiq team] Resend nettverksfeil:', msg);
    return { sent: false, reason: 'send_failed', resendError: msg };
  }

  if (!res.ok) {
    const text = await res.text();
    console.warn('[samsiq team] Resend feilet:', res.status, text);
    return {
      sent: false,
      reason: 'resend_error',
      resendStatus: res.status,
      resendError: text.slice(0, 500),
    };
  }

  return { sent: true };
}
