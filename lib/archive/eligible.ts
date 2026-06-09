import { ALL_DOCUMENTS } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import type { CatalogDocument, ISOCertification } from '@/lib/documents/types';
import type { CompanyCertification } from '@/lib/types';
import { ARCHIVE_FILTER_TABS } from './types';

/** Dokumenttyper som hører på bedriftsnivå (ikke maskinspesifikke). */
export function isArchiveEligible(doc: CatalogDocument): boolean {
  if (doc.sourceType === 'ai_generated') return false;
  if (doc.isoScope?.length) return true;
  return false;
}

export function getArchiveEligibleDocuments(): CatalogDocument[] {
  return ALL_DOCUMENTS.filter(isArchiveEligible).sort((a, b) =>
    a.label.localeCompare(b.label, 'nb')
  );
}

export function getArchiveEligibleIds(): DocumentId[] {
  return getArchiveEligibleDocuments().map((d) => d.id);
}

export function isArchiveEligibleId(documentTypeId: string): boolean {
  const doc = ALL_DOCUMENTS.find((d) => d.id === documentTypeId);
  return doc ? isArchiveEligible(doc) : false;
}

/** Filtrer arkivdokumenter basert på registrerte bedriftssertifiseringer. */
export function filterArchiveEligibleByProfile(
  docs: CatalogDocument[],
  certifications: CompanyCertification[] = []
): CatalogDocument[] {
  const standards = new Set(certifications.map((c) => c.standard));
  if (!standards.size) {
    return docs.filter((d) => d.id.includes('policy'));
  }
  return docs.filter((d) => {
    if (!d.isoScope?.length) return true;
    return d.isoScope.some((iso) => standards.has(iso));
  });
}

export function getVisibleArchiveFilterTabs(
  certifications: CompanyCertification[] = []
): typeof ARCHIVE_FILTER_TABS {
  const standards = new Set(certifications.map((c) => c.standard));
  if (!standards.size) {
    return ARCHIVE_FILTER_TABS.filter(
      (t) => t.id === 'all' || t.id === 'policies'
    );
  }
  return ARCHIVE_FILTER_TABS.filter((tab) => {
    if (tab.id === 'all' || tab.id === 'policies' || tab.id === 'certifications') {
      return true;
    }
    return standards.has(tab.id as ISOCertification);
  });
}
