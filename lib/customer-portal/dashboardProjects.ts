import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { computeCustomerProjectStatus } from '@/lib/customer-portal/projectStatus';
import type { CustomerDashboardProject } from '@/lib/customer-portal/types';
import type { ProjectRevisionCycle } from '@/types/database';
import { getUnreadCountsByProject } from '@/lib/customer-portal/notifications';

export type { CustomerDashboardProject };

async function resolveSupplierName(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  projectUserId: string,
  produsent: string | null
): Promise<string> {
  const { data: owner } = await admin
    .from('users')
    .select('company_id')
    .eq('id', projectUserId)
    .maybeSingle();

  if (owner?.company_id) {
    const { data: cp } = await admin
      .from('company_profiles')
      .select('company_name')
      .eq('id', owner.company_id)
      .maybeSingle();
    if (cp?.company_name) return cp.company_name;
  }

  const { data: ownedProfile } = await admin
    .from('company_profiles')
    .select('company_name')
    .eq('user_id', projectUserId)
    .maybeSingle();
  if (ownedProfile?.company_name) return ownedProfile.company_name;

  return produsent?.trim() || 'Leverandør';
}

export async function fetchCustomerDashboardProjects(
  authUserId: string
): Promise<{ organizationName: string; projects: CustomerDashboardProject[] }> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');
  }

  const { data: memberships, error: memberErr } = await admin
    .from('customer_users')
    .select('customer_organization_id, customer_organizations(name)')
    .eq('auth_user_id', authUserId);

  if (memberErr) throw memberErr;
  if (!memberships?.length) {
    return { organizationName: 'Kunde', projects: [] };
  }

  const orgIds = memberships.map((m) => m.customer_organization_id);
  const unreadByProject = await getUnreadCountsByProject(orgIds);
  const firstOrg = memberships[0].customer_organizations as
    | { name?: string }
    | { name?: string }[]
    | null;
  const organizationName = Array.isArray(firstOrg)
    ? firstOrg[0]?.name ?? 'Kunde'
    : firstOrg?.name ?? 'Kunde';

  const { data: accessRows, error: accessErr } = await admin
    .from('customer_project_access')
    .select('project_id')
    .in('customer_organization_id', orgIds)
    .eq('status', 'active');

  if (accessErr) throw accessErr;

  const projectIds = [...new Set((accessRows ?? []).map((r) => r.project_id))];
  if (projectIds.length === 0) {
    return { organizationName, projects: [] };
  }

  const { data: projects, error: projectErr } = await admin
    .from('prosjekter')
    .select('id, navn, produsent, user_id, updated_at, created_at')
    .in('id', projectIds);

  if (projectErr) throw projectErr;

  const { data: cycles, error: cycleErr } = await admin
    .from('project_revision_cycles')
    .select('project_id, cycle_number, status')
    .in('project_id', projectIds);

  if (cycleErr) throw cycleErr;

  const cyclesByProject = new Map<string, Pick<ProjectRevisionCycle, 'cycle_number' | 'status'>[]>();
  for (const cycle of cycles ?? []) {
    const list = cyclesByProject.get(cycle.project_id) ?? [];
    list.push({ cycle_number: cycle.cycle_number, status: cycle.status });
    cyclesByProject.set(cycle.project_id, list);
  }

  const dashboardProjects: CustomerDashboardProject[] = [];

  for (const project of projects ?? []) {
    const status = computeCustomerProjectStatus(cyclesByProject.get(project.id) ?? []);
    dashboardProjects.push({
      id: project.id,
      name: project.navn,
      supplierName: await resolveSupplierName(admin, project.user_id, project.produsent),
      produsent: project.produsent,
      updatedAt: project.updated_at ?? project.created_at,
      status,
      unreadNotifications: unreadByProject[project.id] ?? 0,
    });
  }

  dashboardProjects.sort((a, b) => {
    if (a.status.priority !== b.status.priority) {
      return a.status.priority - b.status.priority;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { organizationName, projects: dashboardProjects };
}
