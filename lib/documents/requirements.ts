import type { DocumentId } from './ids';
import { CORE_DOCUMENT_IDS } from './ids';
import { ALL_DOCUMENTS, getCatalogDocument } from './catalog';
import { matchesConditionalRules } from './conditionals';
import type { CatalogDocument, ISOCertification, ProjectContext } from './types';

export type { ProjectContext } from './types';

function activeCertifications(project: ProjectContext): ISOCertification[] {
  const raw = project.certifications ?? [];
  return raw.filter((c) => c !== 'none');
}

function matchesIsoScope(
  doc: CatalogDocument,
  certifications: ISOCertification[]
): boolean {
  if (!doc.isoScope?.length) return false;
  if (!certifications.length) return false;
  return doc.isoScope.some((iso) => certifications.includes(iso));
}

function passesVisibility(doc: CatalogDocument, project: ProjectContext): boolean {
  if (doc.showWhen && !doc.showWhen(project)) return false;
  if (doc.conditionalOn?.length) {
    return matchesConditionalRules(doc.conditionalOn, project);
  }
  return true;
}

/** Alle dokumenter som automatisk inngår i prosjektets kravsett. */
export function deriveRequirements(
  project: ProjectContext,
  selectedAi: DocumentId[] = [],
  selectedHybrid: DocumentId[] = []
): CatalogDocument[] {
  const certifications = activeCertifications(project);
  const added = new Set(project.addedDocuments ?? []);
  const result = new Map<string, CatalogDocument>();

  for (const doc of ALL_DOCUMENTS) {
    const inCore = CORE_DOCUMENT_IDS.includes(doc.id);
    const isoMatch = matchesIsoScope(doc, certifications);
    const conditionalMatch =
      !!doc.conditionalOn?.length &&
      matchesConditionalRules(doc.conditionalOn, project);
    const manuallyAdded = added.has(doc.id);

    if (!passesVisibility(doc, project) && !manuallyAdded) continue;

    if (doc.sourceType === 'user_upload') {
      const includeUpload =
        doc.id === 'cad_drawings' ||
        conditionalMatch ||
        isoMatch ||
        manuallyAdded;
      if (includeUpload) result.set(doc.id, doc);
      continue;
    }

    if (manuallyAdded) {
      result.set(doc.id, doc);
      continue;
    }

    if (isoMatch && doc.isoScope?.length) {
      result.set(doc.id, doc);
      continue;
    }

    if (doc.isoScope?.length) continue;

    if (conditionalMatch) {
      result.set(doc.id, doc);
      continue;
    }

    if (doc.sourceType === 'ai_generated' && (inCore || selectedAi.includes(doc.id))) {
      result.set(doc.id, doc);
      continue;
    }

    if (
      doc.sourceType === 'hybrid' &&
      (selectedHybrid.includes(doc.id) || (doc.required && inCore))
    ) {
      result.set(doc.id, doc);
    }
  }

  // cad_drawings alltid påkrevd
  const cad = getCatalogDocument('cad_drawings');
  if (cad) result.set(cad.id, cad);

  // Eksisterende upload-logikk: sveis → material_certificates
  const structureBlob = [
    project.maskin,
    project.tiltenktbruk,
    project.beskrivelse,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/sveis|stål|konstruksjon|ramme|bærer/i.test(structureBlob)) {
    const mat = getCatalogDocument('material_certificates');
    const weld = getCatalogDocument('weld_certificates');
    if (mat) result.set(mat.id, { ...mat, required: true });
    if (weld) result.set(weld.id, weld);
  }

  return [...result.values()].sort(
    (a, b) => a.zipOrder - b.zipOrder || a.label.localeCompare(b.label, 'nb')
  );
}

/** Søk i hele biblioteket — alle dokumenter er søkbare. */
export function searchDocuments(
  query: string,
  project: ProjectContext,
  activeDocumentIds: string[]
): CatalogDocument[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const active = new Set(activeDocumentIds);

  return ALL_DOCUMENTS.filter((doc) => {
    if (active.has(doc.id)) return false;
    return (
      doc.label.toLowerCase().includes(q) ||
      (doc.labelEN?.toLowerCase().includes(q) ?? false) ||
      (doc.directive?.toLowerCase().includes(q) ?? false) ||
      (doc.standard?.toLowerCase().includes(q) ?? false) ||
      doc.description.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      (doc.reason?.toLowerCase().includes(q) ?? false)
    );
  }).slice(0, 12);
}

export function catalogToUploadRequirement(doc: CatalogDocument) {
  return {
    id: doc.id,
    label: doc.label,
    description: doc.description,
    directive: doc.directive ?? doc.standard,
    acceptedFormats: doc.acceptedFormats ?? ['pdf'],
    required: doc.required,
    reason:
      doc.reason ??
      (doc.directive
        ? `Påkrevd under ${doc.directive}`
        : 'Dokumentasjon som må lastes opp av produsent'),
    requiredContent: doc.requiredContent,
  };
}

export function getActiveDocumentIds(
  project: ProjectContext,
  selectedAi: DocumentId[],
  selectedHybrid: DocumentId[]
): string[] {
  return deriveRequirements(project, selectedAi, selectedHybrid).map((d) => d.id);
}
