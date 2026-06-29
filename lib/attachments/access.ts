import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { resolveAttachmentUploaderRole } from '@/lib/attachments/resolveRole';
import type { AttachmentUploaderRole } from '@/lib/attachments/types';

export type AttachmentAccess = {
  userId: string;
  role: AttachmentUploaderRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/** Krever innlogget bruker med leverandør- eller kunde-tilgang til prosjektet. */
export async function requireAttachmentAccess(
  projectId: string
): Promise<AttachmentAccess | { error: string; status: number }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Ikke innlogget', status: 401 };
  }

  const role = await resolveAttachmentUploaderRole(user.id, projectId);
  if (!role) {
    return { error: 'Ingen tilgang til prosjektet', status: 403 };
  }

  return { userId: user.id, role, supabase };
}
