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

  const { data: authUserRow } = await admin
    .from('users')
    .select('email')
    .eq('id', authUserId)
    .maybeSingle();
  const authEmail = authUserRow?.email?.trim().toLowerCase() ?? '';

  const { data: memberships, error: memberErr } = await admin
    .from('customer_users')
    .select('id, customer_organization_id, auth_user_id, email, customer_organizations(name)')
    .eq('auth_user_id', authUserId);

  // #region agent log
  fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:memberships',message:'customer_users by auth_user_id',data:{authUserId,authEmail,membershipCount:memberships?.length??0,memberErr:memberErr?.message??null,orgIds:(memberships??[]).map(m=>m.customer_organization_id)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (memberErr) throw memberErr;

  let resolvedMemberships = memberships ?? [];

  if (resolvedMemberships.length === 0 && authEmail) {
    const { data: byEmail } = await admin
      .from('customer_users')
      .select('id, customer_organization_id, auth_user_id, email, customer_organizations(name)')
      .ilike('email', authEmail);

    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:byEmail',message:'customer_users fallback by email',data:{authEmail,byEmailCount:byEmail?.length??0,rows:(byEmail??[]).map(r=>({id:r.id,authUserId:r.auth_user_id,orgId:r.customer_organization_id}))},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    resolvedMemberships = byEmail ?? [];

    for (const row of resolvedMemberships) {
      if (!row.auth_user_id) {
        await admin
          .from('customer_users')
          .update({ auth_user_id: authUserId })
          .eq('id', row.id);
      }
    }
  }

  if (!resolvedMemberships.length) {
    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:earlyEmpty',message:'no memberships — returning empty',data:{authUserId,authEmail},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return { organizationName: 'Kunde', projects: [] };
  }

  const orgIds = resolvedMemberships.map((m) => m.customer_organization_id);
  const customerUserIds = resolvedMemberships.map((m) => m.id);
  const unreadByProject = await getUnreadCountsByProject(orgIds);
  const firstOrg = resolvedMemberships[0].customer_organizations as
    | { name?: string }
    | { name?: string }[]
    | null;
  const organizationName = Array.isArray(firstOrg)
    ? firstOrg[0]?.name ?? 'Kunde'
    : firstOrg?.name ?? 'Kunde';

  const { data: accessByOrg, error: accessOrgErr } = await admin
    .from('customer_project_access')
    .select('project_id, customer_organization_id, customer_user_id, invited_email')
    .in('customer_organization_id', orgIds)
    .eq('status', 'active');

  let accessRows = accessByOrg ?? [];

  if (customerUserIds.length > 0) {
    const { data: accessByUser } = await admin
      .from('customer_project_access')
      .select('project_id, customer_organization_id, customer_user_id, invited_email')
      .in('customer_user_id', customerUserIds)
      .eq('status', 'active');
    for (const row of accessByUser ?? []) {
      if (!accessRows.some((r) => r.project_id === row.project_id)) {
        accessRows.push(row);
      }
    }
  }

  if (authEmail) {
    const { data: accessByEmail } = await admin
      .from('customer_project_access')
      .select('project_id, customer_organization_id, customer_user_id, invited_email')
      .ilike('invited_email', authEmail)
      .eq('status', 'active');
    for (const row of accessByEmail ?? []) {
      if (!accessRows.some((r) => r.project_id === row.project_id)) {
        accessRows.push(row);
      }
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:access',message:'customer_project_access resolved',data:{orgIds,customerUserIds,accessOrgErr:accessOrgErr?.message??null,accessByOrgOnly:(accessByOrg??[]).length,accessCountFinal:accessRows.length,accessSample:accessRows.slice(0,5)},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
  // #endregion

  if (accessOrgErr) throw accessOrgErr;

  const projectIds = [...new Set(accessRows.map((r) => r.project_id))];
  if (projectIds.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:noProjects',message:'access rows but no project ids',data:{accessCount:accessRows.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return { organizationName, projects: [] };
  }

  const { data: projects, error: projectErr } = await admin
    .from('prosjekter')
    .select('id, navn, produsent, user_id, updated_at, created_at')
    .in('id', projectIds);

  // #region agent log
  fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'dashboardProjects.ts:prosjekter',message:'prosjekter query result',data:{projectIdsRequested:projectIds.length,projectsFound:projects?.length??0,projectErr:projectErr?.message??null,missingIds:projectIds.filter(id=>!(projects??[]).some(p=>p.id===id)).slice(0,5)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

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
