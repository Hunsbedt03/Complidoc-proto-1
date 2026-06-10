import 'server-only';

import { readFileSync } from 'fs';
import { join } from 'path';
import { loadEnvConfig } from '@next/env';
import { readLocalEnvValue, resolveProjectRoot } from '@/lib/env/localEnv';

let envLoaded = false;
function ensureProjectEnvLoaded(): void {
  if (envLoaded) return;
  loadEnvConfig(resolveProjectRoot());
  envLoaded = true;
}

function readProcessEnv(name: string): string | undefined {
  // Dynamisk nøkkel — unngår at Next.js inliner undefined ved kompilering
  // når variabelen ble lagt til i .env.local etter første build.
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readDevKeyFile(): string | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined;
  try {
    const fromFile = readFileSync(
      join(resolveProjectRoot(), '.resend-api-key.local'),
      'utf8'
    ).trim();
    return fromFile || undefined;
  } catch {
    return undefined;
  }
}

/** Leser Resend API-nøkkel fra env (eller valgfri dev-fil). */
export function resolveResendApiKey(): string | undefined {
  ensureProjectEnvLoaded();
  return (
    readProcessEnv('RESEND_API_KEY') ||
    readLocalEnvValue('RESEND_API_KEY') ||
    readDevKeyFile()
  );
}

/** Avsenderadresse — støtter både INVITE_EMAIL_FROM og RESEND_FROM_EMAIL. */
export function resolveInviteEmailFrom(): string {
  ensureProjectEnvLoaded();
  return (
    readProcessEnv('INVITE_EMAIL_FROM') ||
    readLocalEnvValue('INVITE_EMAIL_FROM') ||
    readProcessEnv('RESEND_FROM_EMAIL') ||
    readLocalEnvValue('RESEND_FROM_EMAIL') ||
    'Samsiq <onboarding@resend.dev>'
  );
}
