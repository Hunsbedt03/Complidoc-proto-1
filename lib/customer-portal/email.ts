import 'server-only';

import { resolveInviteEmailFrom, resolveResendApiKey } from '@/lib/team/resendConfig';

export type CustomerEmailResult = {
  sent: boolean;
  reason?: 'email_not_configured' | 'send_failed' | 'resend_error';
  resendStatus?: number;
};

async function sendHtmlEmail(
  to: string,
  subject: string,
  html: string
): Promise<CustomerEmailResult> {
  const apiKey = resolveResendApiKey();
  const from = resolveInviteEmailFrom();

  if (!apiKey) {
    console.warn('[samsiq customer] RESEND_API_KEY mangler — e-post sendes ikke');
    return { sent: false, reason: 'email_not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('[samsiq customer] Resend feilet:', res.status, text);
      return { sent: false, reason: 'resend_error', resendStatus: res.status };
    }

    return { sent: true };
  } catch (err) {
    console.warn('[samsiq customer] Resend nettverksfeil:', err);
    return { sent: false, reason: 'send_failed' };
  }
}

export async function sendCustomerProjectInviteEmail(input: {
  to: string;
  supplierName: string;
  projectName: string;
  registerUrl: string;
}): Promise<CustomerEmailResult> {
  return sendHtmlEmail(
    input.to,
    `Invitasjon til dokumentasjon — ${input.projectName}`,
    `
      <p>Hei,</p>
      <p>${input.supplierName} har gitt deg tilgang til dokumentasjonspakken <strong>${input.projectName}</strong> på Samsiq.</p>
      <p><a href="${input.registerUrl}">Opprett konto eller logg inn</a> for å se dokumentasjonen.</p>
      <p>— Samsiq</p>
    `
  );
}

export async function sendCustomerReviewRequestEmail(input: {
  to: string;
  projectName: string;
  projectUrl: string;
  isRevision: boolean;
}): Promise<CustomerEmailResult> {
  const intro = input.isRevision
    ? 'En revidert dokumentasjonspakke er signert av leverandøren og klar for din gjennomgang og signering.'
    : 'Dokumentasjonspakken er signert av leverandøren og klar for din gjennomgang og signering.';

  return sendHtmlEmail(
    input.to,
    `${input.isRevision ? 'Revisjon klar' : 'Dokumentasjon klar'} — ${input.projectName}`,
    `
      <p>Hei,</p>
      <p>${intro}</p>
      <p><strong>${input.projectName}</strong></p>
      <p><a href="${input.projectUrl}">Åpne prosjektet og signer akseptanseprotokoll</a></p>
      <p>— Samsiq</p>
    `
  );
}

export async function sendRevisionOpenedEmail(input: {
  to: string;
  projectName: string;
  projectUrl: string;
  reason: string;
}): Promise<CustomerEmailResult> {
  return sendHtmlEmail(
    input.to,
    `Revisjon startet — ${input.projectName}`,
    `
      <p>Hei,</p>
      <p>Leverandøren har startet en revisjon av dokumentasjonspakken <strong>${input.projectName}</strong>.</p>
      <p>Årsak: ${input.reason}</p>
      <p>Du beholder tilgang til siste godkjente versjon til den nye revisjonen er signert.</p>
      <p><a href="${input.projectUrl}">Se prosjektet</a></p>
      <p>— Samsiq</p>
    `
  );
}
