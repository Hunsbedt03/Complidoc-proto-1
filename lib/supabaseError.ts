/** Serialize Supabase/PostgREST errors for logs and UI (avoids "[object Object]"). */
export function formatSupabaseError(err: unknown): string {
  if (err == null) return 'Ukjent feil';
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message && err.message !== '[object Object]') {
    return err.message;
  }

  const o = err as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.message === 'string' && o.message) parts.push(o.message);
  if (typeof o.code === 'string' && o.code) parts.push(`(${o.code})`);
  if (typeof o.details === 'string' && o.details) parts.push(o.details);
  if (typeof o.hint === 'string' && o.hint) parts.push(o.hint);
  if (parts.length) return parts.join(' ');

  try {
    return JSON.stringify(err);
  } catch {
    return 'Ukjent feil';
  }
}

export function supabaseErrorFields(err: unknown): Record<string, unknown> {
  if (err == null) return {};
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    return {
      message: o.message,
      code: o.code,
      details: o.details,
      hint: o.hint,
      name: o.name,
    };
  }
  return { raw: String(err) };
}
