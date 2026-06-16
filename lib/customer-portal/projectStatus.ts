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

type CycleLike = Pick<ProjectRevisionCycle, 'cycle_number' | 'status' | 'customer_signed_at'>;

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

/** Felles statuslogikk for kundevisning (banner + dashboard). */
export function buildCustomerRevisionBanner(
  cycles: CycleLike[],
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

  const status = computeCustomerProjectStatus(cycles);

  if (status.kind === 'awaiting_signature') {
    return {
      kind: 'awaiting_customer',
      title:
        'Dokumentasjonen er signert av leverandøren og klar for din gjennomgang',
      canSign: true,
    };
  }

  if (status.kind === 'under_revision') {
    return {
      kind: 'under_revision',
      title: status.viewingCycleNumber
        ? `Du ser godkjent versjon Rev. ${status.viewingCycleNumber}.`
        : status.label.replace(/^📄\s*/, ''),
      detail:
        'Leverandøren arbeider med en revisjon — du varsles når den er signert og klar for gjennomgang.',
      canSign: false,
      viewingCycleNumber: status.viewingCycleNumber,
    };
  }

  if (status.kind === 'signed') {
    const signed = cycles
      .filter((c) => c.status === 'fully_signed')
      .sort((a, b) => b.cycle_number - a.cycle_number)[0];
    const date = signed?.customer_signed_at
      ? new Date(signed.customer_signed_at).toLocaleDateString('nb-NO')
      : undefined;
    return {
      kind: 'fully_signed',
      title: `✅ Signert — Rev. ${signed?.cycle_number ?? ''}${date ? `, signert ${date}` : ''}`,
      canSign: false,
      signedAt: signed?.customer_signed_at ?? null,
    };
  }

  return {
    kind: 'draft',
    title:
      'Leverandøren arbeider med dokumentasjonen. Du blir varslet når den er signert og klar for gjennomgang.',
    canSign: false,
  };
}

/** Hvilken revisjonssyklus kunden skal se dokumentinnhold fra (null = live). */
export function resolveCustomerDocumentSnapshotCycleId(
  cycles: Pick<ProjectRevisionCycle, 'id' | 'cycle_number' | 'status'>[]
): string | null {
  const locked = cycles.find((c) => c.status === 'locked');
  if (locked) return locked.id;

  const latestSigned = cycles
    .filter((c) => c.status === 'fully_signed')
    .sort((a, b) => b.cycle_number - a.cycle_number)[0];

  const open = cycles.find((c) => c.status === 'open');
  if (latestSigned && (open || !locked)) {
    return latestSigned.id;
  }

  return null;
}
