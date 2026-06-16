import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export async function assertSupplierCanAccessProject(
  userId: string,
  projectId: string,
  db?: SupabaseClient
): Promise<boolean> {
  const admin = db ?? createAdminClient();
  if (!admin) return false;

  const { data: project } = await admin
    .from('prosjekter')
    .select('id, user_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return false;
  if (project.user_id === userId) return true;

  const { data: viewerMember } = await admin
    .from('team_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!viewerMember?.company_id) return false;

  const { data: ownerMember } = await admin
    .from('team_members')
    .select('company_id')
    .eq('user_id', project.user_id)
    .eq('status', 'active')
    .eq('company_id', viewerMember.company_id)
    .maybeSingle();

  return !!ownerMember;
}
