import 'server-only';

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

/** Finner prosjektrot (der package.json + .env.local ligger). */
export function resolveProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(join(dir, 'package.json')) &&
      existsSync(join(dir, '.env.local'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Leser én nøkkel fra .env.local uten å logge verdier (dev-fallback). */
export function readLocalEnvValue(name: string): string | undefined {
  const envPath = join(resolveProjectRoot(), '.env.local');
  if (!existsSync(envPath)) return undefined;

  try {
    const raw = readFileSync(envPath, 'utf8');
    const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      if (key !== name) continue;

      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value || undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
