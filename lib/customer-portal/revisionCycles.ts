import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectRevisionCycle } from '@/types/database';
import {
  sendCustomerReviewRequestEmail,
  sendRevisionOpenedEmail,
} from '@/lib/customer-portal/email';
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

export type CustomerRevisionBanner = {
  kind:
    | 'draft'
    | 'awaiting_customer'
    | 'under_revision'
    | 'fully_signed'
    | 'signed_receipt';
  title: string;
  detail?: string;
  canSign: boolean;
  viewingCycleNumber?: number;
  signedAt?: string | null;
};

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

export function buildCustomerRevisionBanner(
  cycles: ProjectRevisionCycle[],
  justSigned?: boolean
): CustomerRevisionBanner {
  if (justSigned) {
    const signed = cycles.find((c) => c.status === 'fully_signed');
    const date = signed?.customer_signed_at
      ? new Date(signed.customer_signed_at).toLocaleDateString('nb-NO')
      : 'nå';
    return {
      kind: 'signed_receipt',
      title: `Du har signert akseptanseprotokollen ${date}.`,
      detail: 'Dokumentasjonen er nå fullt godkjent av begge parter.',
      canSign: false,
    };
  }

  const openCycle = cycles.find((c) => c.status === 'open');
  const lockedCycle = cycles.find((c) => c.status === 'locked');
  const latestFullySigned = cycles
    .filter((c) => c.status === 'fully_signed')
    .sort((a, b) => b.cycle_number - a.cycle_number)[0];

  if (lockedCycle) {
    return {
      kind: 'awaiting_customer',
      title:
        'Dokumentasjonen er signert av leverandøren og klar for din gjennomgang',
      canSign: true,
    };
  }

  if (openCycle && latestFullySigned) {
    return {
      kind: 'under_revision',
      title: `Du ser godkjent versjon Rev. ${latestFullySigned.cycle_number}.`,
      detail:
        'Leverandøren arbeider med en revisjon — du varsles når den er signert og klar for gjennomgang.',
      canSign: false,
      viewingCycleNumber: latestFullySigned.cycle_number,
    };
  }

  if (latestFullySigned && !openCycle) {
    const date = latestFullySigned.customer_signed_at
      ? new Date(latestFullySigned.customer_signed_at).toLocaleDateString('nb-NO')
      : undefined;
    return {
      kind: 'fully_signed',
      title: `✅ Signert — Rev. ${latestFullySigned.cycle_number}${date ? `, signert ${date}` : ''}`,
      canSign: false,
      signedAt: latestFullySigned.customer_signed_at,
    };
  }

  return {
    kind: 'draft',
    title:
      'Leverandøren arbeider med dokumentasjonen. Du blir varslet når den er signert og klar for gjennomgang.',
    canSign: false,
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

  const result: { orgId: string; emails: string[] }[] = [];

  for (const orgId of orgIds) {
    const { data: users } = await admin
      .from('customer_users')
      .select('email')
      .eq('customer_organization_id', orgId);

    const emails = new Set<string>();
    for (const u of users ?? []) {
      if (u.email) emails.add(u.email.toLowerCase());
    }
    for (const row of accessRows ?? []) {
      if (row.customer_organization_id === orgId && row.invited_email) {
        emails.add(row.invited_email.toLowerCase());
      }
    }
    result.push({ orgId, emails: [...emails] });
  }

  return result;
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
    .select('*')
    .single();

  if (error) throw error;

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
