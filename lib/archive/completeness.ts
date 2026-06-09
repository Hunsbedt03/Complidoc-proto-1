import { getArchiveEligibleDocuments } from './eligible';
import { normalizeArchiveTypeId } from './normalize';
import type { ArchiveDocument } from './types';
import type { ISOCertification } from '@/lib/documents/types';

export type ArchiveCoverageGroup = {
  certification: ISOCertification;
  label: string;
  complete: number;
  total: number;
  percent: number;
  missing: string[];
};

const ISO_GROUPS: { cert: ISOCertification; label: string }[] = [
  { cert: 'iso_9001', label: 'ISO 9001' },
  { cert: 'iso_14001', label: 'ISO 14001' },
  { cert: 'iso_45001', label: 'ISO 45001' },
];

/** Aktive arkivdokumenter indeksert på normalisert document_type_id. */
export function archiveActiveByType(
  docs: ArchiveDocument[]
): Map<string, ArchiveDocument> {
  const map = new Map<string, ArchiveDocument>();
  for (const doc of docs.filter((d) => d.isActive)) {
    const key = normalizeArchiveTypeId(doc.documentTypeId);
    const existing = map.get(key);
    if (
      !existing ||
      new Date(doc.uploadedAt).getTime() > new Date(existing.uploadedAt).getTime()
    ) {
      map.set(key, doc);
    }
  }
  return map;
}

export function computeArchiveCoverage(
  archiveDocs: ArchiveDocument[]
): ArchiveCoverageGroup[] {
  const active = archiveActiveByType(archiveDocs);
  const eligible = getArchiveEligibleDocuments();

  return ISO_GROUPS.map(({ cert, label }) => {
    const required = eligible.filter((d) => d.isoScope?.includes(cert));
    const missing: string[] = [];
    let complete = 0;

    for (const req of required) {
      if (active.has(normalizeArchiveTypeId(req.id))) {
        complete += 1;
      } else {
        missing.push(req.label);
      }
    }

    const total = required.length;
    return {
      certification: cert,
      label,
      complete,
      total,
      percent: total > 0 ? Math.round((complete / total) * 100) : 0,
      missing,
    };
  }).filter((g) => g.total > 0);
}

export function daysUntilReview(doc: ArchiveDocument): number | null {
  if (doc.validUntil) {
    const end = new Date(doc.validUntil).getTime();
    return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  }
  if (doc.reviewIntervalMonths && doc.uploadedAt) {
    const uploaded = new Date(doc.uploadedAt);
    const nextReview = new Date(uploaded);
    nextReview.setMonth(nextReview.getMonth() + doc.reviewIntervalMonths);
    return Math.ceil((nextReview.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }
  return null;
}

export function isReviewSoon(doc: ArchiveDocument, withinDays = 60): boolean {
  const days = daysUntilReview(doc);
  return days !== null && days <= withinDays;
}
