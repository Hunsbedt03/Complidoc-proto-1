/** Parse API JSON without throwing on empty/invalid bodies. */
export async function parseJsonResponse<T extends Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text.slice(0, 500) } as unknown as T;
  }
}

export function formatApiError(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const o = error as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function isSupabaseSetupError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    message.includes('patch-ensure-user-profile') ||
    message.includes('SERVICE_ROLE') ||
    message.includes('42501') ||
    message.includes('PGRST202') ||
    message.includes('ensure_user_profile') ||
    message.includes('brukerprofiler') ||
    message.includes('Database mangler oppsett') ||
    m.includes('row-level security') ||
    message.includes('23503') ||
    m.includes('foreign key')
  );
}
