import type { ProjectRevisionCycle } from '@/types/database';

export type CustomerProjectStatusKind =
  | 'waiting_supplier'
  | 'under_revision'
  | 'awaiting_signature'
  | 'signed';

export type CustomerProjectStatus = {
  kind: CustomerProjectStatusKind;
  label: string;
  /** Lavere = høyere prioritet i dashboard-sortering */
  priority: number;
  viewingCycleNumber?: number;
};

export function computeCustomerProjectStatus(
  cycles: Pick<ProjectRevisionCycle, 'cycle_number' | 'status'>[]
): CustomerProjectStatus {
  if (cycles.length === 0) {
    return {
      kind: 'waiting_supplier',
      label: '⏳ Venter på leverandør',
      priority: 3,
    };
  }

  const sorted = [...cycles].sort((a, b) => b.cycle_number - a.cycle_number);
  const latest = sorted[0];
  const lastSigned = sorted.find((c) => c.status === 'fully_signed');

  if (latest.status === 'locked') {
    return {
      kind: 'awaiting_signature',
      label: '🔔 Venter på din signering',
      priority: 0,
    };
  }

  if (latest.status === 'fully_signed') {
    return {
      kind: 'signed',
      label: `✅ Signert — Rev. ${latest.cycle_number}`,
      priority: 1,
    };
  }

  if (latest.status === 'open' && lastSigned) {
    return {
      kind: 'under_revision',
      label: `📄 Under revisjon — du ser siste godkjente versjon (Rev. ${lastSigned.cycle_number})`,
      priority: 2,
      viewingCycleNumber: lastSigned.cycle_number,
    };
  }

  return {
    kind: 'waiting_supplier',
    label: '⏳ Venter på leverandør',
    priority: 3,
  };
}
