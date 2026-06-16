import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectRevisionCycle } from '@/types/database';
import {
  sendCustomerReviewRequestEmail,
  sendRevisionOpenedEmail,
} from '@/lib/customer-portal/email';
import { snapshotAllProjectDocumentsForCycle } from '@/lib/customer-portal/documentSnapshots';
import { getAppUrl } from '@/lib/appUrl';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';
import { hasActiveCustomerAccess } from '@/lib/customer-portal/access';

export type SupplierRevisionState = {
  cycles: ProjectRevisionCycle[];
  openCycle: ProjectRevisionCycle | null;
  latestFullySigned: ProjectRevisionCycle | null;
  lockedCycle: ProjectRevisionCycle | null;
  hasActiveCustomers: boolean;
  canSignAndSend: boolean;
  canReopenRevision: boolean;
  revisionLocked: boolean;
  statusMessage: string;
};

export type CustomerRevisionBanner = import('@/lib/customer-portal/projectStatus').CustomerRevisionBanner;

export { buildCustomerRevisionBanner } from '@/lib/customer-portal/projectStatus';

export async function fetchProjectRevisionCycles(
  projectId: string
): Promise<ProjectRevisionCycle[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from('project_revision_cycles')
    .select('*')
    .eq('project_id', projectId)
    .order('cycle_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProjectRevisionCycle[];
}

export function buildSupplierRevisionState(
  cycles: ProjectRevisionCycle[],
  hasActiveCustomers: boolean
): SupplierRevisionState {
  const openCycle = cycles.find((c) => c.status === 'open') ?? null;
  const lockedCycle = cycles.find((c) => c.status === 'locked') ?? null;
  const fullySigned = cycles.filter((c) => c.status === 'fully_signed');
  const latestFullySigned =
    fullySigned.sort((a, b) => b.cycle_number - a.cycle_number)[0] ?? null;

  const canSignAndSend =
    hasActiveCustomers && !!openCycle && openCycle.status === 'open';
  const canReopenRevision =
    hasActiveCustomers && !!latestFullySigned && !openCycle && !lockedCycle;
  const revisionLocked = !!lockedCycle;

  let statusMessage = 'Ingen signeringssyklus startet ennå.';
  if (lockedCycle) {
    statusMessage = 'Signert og sendt til kunde — venter på kundens akseptanse.';
  } else if (latestFullySigned && openCycle) {
    statusMessage = `Revisjon Rev. ${openCycle.cycle_number} pågår — Rev. ${latestFullySigned.cycle_number} er kundens godkjente versjon.`;
  } else if (latestFullySigned) {
    const date = latestFullySigned.customer_signed_at
      ? new Date(latestFullySigned.customer_signed_at).toLocaleDateString('nb-NO')
      : null;
    statusMessage = date
      ? `Fullt signert — kunde aksepterte ${date}.`
      : `Fullt signert — Rev. ${latestFullySigned.cycle_number}.`;
  } else if (openCycle) {
    statusMessage = `Rev. ${openCycle.cycle_number} — klar til signering og utsendelse til kunde.`;
  }

  return {
    cycles,
    openCycle,
    latestFullySigned,
    lockedCycle,
    hasActiveCustomers,
    canSignAndSend,
    canReopenRevision,
    revisionLocked,
    statusMessage,
  };
}

async function getActiveCustomerEmailsByProject(
  projectId: string
): Promise<{ orgId: string; emails: string[] }[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: accessRows } = await admin
    .from('customer_project_access')
    .select('customer_organization_id, invited_email')
    .eq('project_id', projectId)
    .eq('status', 'active');

  const orgIds = [
    ...new Set(
      (accessRows ?? [])
        .map((r) => r.customer_organization_id)
        .filter((id): id is string => !!id)
    ),
  ];

  if (orgIds.length === 0) return [];

  const { data: allUsers } = await admin
    .from('customer_users')
    .select('email, customer_organization_id')
    .in('customer_organization_id', orgIds);

  const usersByOrg = new Map<string, Set<string>>();
  for (const u of allUsers ?? []) {
    if (!u.email || !u.customer_organization_id) continue;
    const set = usersByOrg.get(u.customer_organization_id) ?? new Set<string>();
    set.add(u.email.toLowerCase());
    usersByOrg.set(u.customer_organization_id, set);
  }

  return orgIds.map((orgId) => {
    const emails = usersByOrg.get(orgId) ?? new Set<string>();
    for (const row of accessRows ?? []) {
      if (row.customer_organization_id === orgId && row.invited_email) {
        emails.add(row.invited_email.toLowerCase());
      }
    }
    return { orgId, emails: [...emails] };
  });
}

async function notifyCustomerOrganizations(input: {
  projectId: string;
  cycleId: string;
  type: 'package_ready_for_review' | 'revision_ready_for_review' | 'revision_opened';
  projectName: string;
  reason?: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: alreadySent } = await admin
    .from('customer_notifications')
    .select('id, email_sent_at')
    .eq('revision_cycle_id', input.cycleId)
    .eq('type', input.type)
    .not('email_sent_at', 'is', null)
    .limit(1);

  if (alreadySent && alreadySent.length > 0) {
    return;
  }

  const orgGroups = await getActiveCustomerEmailsByProject(input.projectId);
  const projectUrl = `${getAppUrl().replace(/\/$/, '')}/app/customer/projects/${input.projectId}`;
  const isRevision =
    input.type === 'revision_ready_for_review' || input.type === 'revision_opened';

  for (const group of orgGroups) {
    const { data: notification, error } = await admin
      .from('customer_notifications')
      .insert({
        customer_organization_id: group.orgId,
        project_id: input.projectId,
        revision_cycle_id: input.cycleId,
        type: input.type,
        customer_user_id: null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[samsiq] customer notification insert', error);
      continue;
    }

    let anySent = false;
    for (const email of group.emails) {
      const result =
        input.type === 'revision_opened'
          ? await sendRevisionOpenedEmail({
              to: email,
              projectName: input.projectName,
              projectUrl,
              reason: input.reason ?? 'Revisjon',
            })
          : await sendCustomerReviewRequestEmail({
              to: email,
              projectName: input.projectName,
              projectUrl,
              isRevision,
            });
      if (result.sent) anySent = true;
    }

    if (anySent && notification?.id) {
      await admin
        .from('customer_notifications')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', notification.id);
    }
  }
}

export async function ensureOpenRevisionCycle(
  projectId: string
): Promise<ProjectRevisionCycle> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const cycles = await fetchProjectRevisionCycles(projectId);
  const existing = cycles.find((c) => c.status === 'open');
  if (existing) return existing;

  if (cycles.some((c) => c.status === 'locked')) {
    throw new Error('Prosjektet venter på kundesignering — kan ikke opprette ny åpen syklus');
  }

  const maxNumber = cycles.reduce((max, c) => Math.max(max, c.cycle_number), 0);

  const { data, error } = await admin
    .from('project_revision_cycles')
    .insert({
      project_id: projectId,
      cycle_number: maxNumber + 1,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as ProjectRevisionCycle;
}

export async function supplierSignAndSend(input: {
  projectId: string;
  userId: string;
  userName: string;
  projectName: string;
}): Promise<ProjectRevisionCycle> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const allowed = await assertSupplierCanAccessProject(input.userId, input.projectId, admin);
  if (!allowed) throw new Error('Ingen tilgang til prosjektet');

  const hasCustomers = await hasActiveCustomerAccess(input.projectId);
  if (!hasCustomers) throw new Error('Inviter minst én aktiv kunde før utsendelse');

  const cycles = await fetchProjectRevisionCycles(input.projectId);
  const lockedCycle = cycles.find((c) => c.status === 'locked');
  if (lockedCycle) {
    await snapshotAllProjectDocumentsForCycle(lockedCycle.id, input.projectId).catch((err) => {
      console.warn('[samsiq] snapshotAllProjectDocumentsForCycle', err);
    });
    const notifType =
      lockedCycle.cycle_number > 1 ? 'revision_ready_for_review' : 'package_ready_for_review';
    await notifyCustomerOrganizations({
      projectId: input.projectId,
      cycleId: lockedCycle.id,
      type: notifType,
      projectName: input.projectName,
    });
    return lockedCycle;
  }

  const openCycle = await ensureOpenRevisionCycle(input.projectId);
  if (openCycle.status !== 'open') {
    throw new Error('Prosjektet venter allerede på kundesignering');
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await admin
    .from('project_revision_cycles')
    .update({
      supplier_signed_by: input.userId,
      supplier_signed_by_name: input.userName,
      supplier_signed_at: now,
      supplier_signature_method: 'simple',
      supplier_locked_at: now,
      status: 'locked',
      updated_at: now,
    })
    .eq('id', openCycle.id)
    .eq('status', 'open')
    .select('*')
    .single();

  if (error) throw error;

  await snapshotAllProjectDocumentsForCycle(updated.id, input.projectId).catch((err) => {
    console.warn('[samsiq] snapshotAllProjectDocumentsForCycle', err);
  });

  const notifType =
    updated.cycle_number > 1 ? 'revision_ready_for_review' : 'package_ready_for_review';

  await notifyCustomerOrganizations({
    projectId: input.projectId,
    cycleId: updated.id,
    type: notifType,
    projectName: input.projectName,
  });

  return updated as ProjectRevisionCycle;
}

export async function customerSignAcceptance(input: {
  projectId: string;
  authUserId: string;
  customerUserId: string;
  customerUserName: string;
  metadata?: Record<string, unknown>;
}): Promise<ProjectRevisionCycle> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const cycles = await fetchProjectRevisionCycles(input.projectId);
  const lockedCycle = cycles.find((c) => c.status === 'locked');
  if (!lockedCycle) throw new Error('Ingen pakke venter på signering');

  const now = new Date().toISOString();

  const { data: updated, error } = await admin
    .from('project_revision_cycles')
    .update({
      customer_signed_by: input.customerUserId,
      customer_signed_by_name: input.customerUserName,
      customer_signed_at: now,
      customer_signature_method: 'simple',
      customer_signature_metadata: input.metadata ?? null,
      status: 'fully_signed',
      updated_at: now,
    })
    .eq('id', lockedCycle.id)
    .select('*')
    .single();

  if (error) throw error;

  const previousSigned = cycles.filter(
    (c) => c.status === 'fully_signed' && c.id !== lockedCycle.id
  );
  for (const prev of previousSigned) {
    await admin
      .from('project_revision_cycles')
      .update({ status: 'superseded', updated_at: now })
      .eq('id', prev.id);
  }

  return updated as ProjectRevisionCycle;
}

export async function reopenProjectRevision(input: {
  projectId: string;
  userId: string;
  reason: string;
  projectName: string;
}): Promise<ProjectRevisionCycle> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

  const allowed = await assertSupplierCanAccessProject(input.userId, input.projectId, admin);
  if (!allowed) throw new Error('Ingen tilgang til prosjektet');

  const cycles = await fetchProjectRevisionCycles(input.projectId);
  const hasOpen = cycles.some((c) => c.status === 'open');
  const hasLocked = cycles.some((c) => c.status === 'locked');
  if (hasOpen || hasLocked) {
    throw new Error('En revisjon er allerede aktiv');
  }

  const latestSigned = cycles
    .filter((c) => c.status === 'fully_signed')
    .sort((a, b) => b.cycle_number - a.cycle_number)[0];

  if (!latestSigned) {
    throw new Error('Prosjektet må være fullt signert før revisjon kan startes');
  }

  const { data, error } = await admin
    .from('project_revision_cycles')
    .insert({
      project_id: input.projectId,
      cycle_number: latestSigned.cycle_number + 1,
      status: 'open',
      reopened_reason: input.reason.trim(),
      reopened_by: input.userId,
    })
    .select('*')
    .single();

  if (error) throw error;

  await notifyCustomerOrganizations({
    projectId: input.projectId,
    cycleId: data.id,
    type: 'revision_opened',
    projectName: input.projectName,
    reason: input.reason.trim(),
  });

  return data as ProjectRevisionCycle;
}

export async function getSupplierRevisionState(
  projectId: string
): Promise<SupplierRevisionState> {
  const [cycles, hasActiveCustomers] = await Promise.all([
    fetchProjectRevisionCycles(projectId),
    hasActiveCustomerAccess(projectId),
  ]);
  return buildSupplierRevisionState(cycles, hasActiveCustomers);
}
