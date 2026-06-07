import type { ProjectInput } from './suggest';

export type UploadRequirementId = string;

export type UploadRequirement = {
  id: UploadRequirementId;
  label: string;
  description: string;
  directive?: string;
  acceptedFormats: string[];
  required: boolean;
  reason: string;
};

function lc(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

/**
 * Utleder hvilke filer brukeren bør laste opp basert på lagret maskindata.
 * Beregnes på nytt ved hver visning av prosjektsiden.
 */
export function deriveUploadRequirements(project: ProjectInput): UploadRequirement[] {
  const requirements: UploadRequirement[] = [];

  const driveSystem = project.drivsystem ?? '';
  const controlSystem = project.styring ?? '';
  const machineName = project.maskin ?? '';
  const intendedUse = project.tiltenktbruk ?? '';
  const installationEnv = project.installasjonsmiljo ?? '';
  const description = project.beskrivelse ?? '';

  const electricBlob = lc(driveSystem, controlSystem, description);
  const structureBlob = lc(machineName, intendedUse, description);
  const envBlob = lc(installationEnv);
  const pressureBlob = lc(machineName, intendedUse, driveSystem, description);
  const liftingBlob = lc(machineName, intendedUse, description);

  requirements.push({
    id: 'cad_drawings',
    label: 'Konstruksjonstegninger (CAD)',
    description: 'Generell-, detalj- og monteringstegninger',
    directive: '2006/42/EF Vedlegg VII',
    acceptedFormats: ['pdf', 'dwg', 'dxf', 'step', 'png'],
    required: true,
    reason: 'Påkrevd for alle maskiner under Maskindirektivet',
  });

  const hasElectric = matches(
    electricBlob,
    /\d+\s*v|kw|ac|dc|elektrisk|motor|frekvensomformer|plc|styring/i
  );

  if (hasElectric) {
    requirements.push({
      id: 'emc_report',
      label: 'EMC-testrapport',
      description: 'Fra akkreditert laboratorium',
      directive: '2014/30/EU',
      acceptedFormats: ['pdf'],
      required: true,
      reason: `Maskinen har elektrisk utstyr (${driveSystem || controlSystem || 'elektrisk styring'})`,
    });
    requirements.push({
      id: 'electrical_diagrams',
      label: 'Elektriske schematics / koblingsskjema',
      description: 'Komplett elektrisk dokumentasjon',
      directive: '2014/35/EU',
      acceptedFormats: ['pdf', 'dwg'],
      required: true,
      reason: 'Påkrevd for elektrisk utstyr under lavspenningsdirektivet',
    });
  }

  const hasWelding = matches(
    structureBlob,
    /sveis|stål|konstruksjon|ramme|bærer/i
  );

  if (hasWelding) {
    requirements.push({
      id: 'weld_certificates',
      label: 'Sveisesertifikater (WPS/WPQR)',
      description: 'Sveiseprosedyrespesifikasjon og sveisergodkjenning',
      acceptedFormats: ['pdf'],
      required: false,
      reason: 'Anbefalt for maskiner med sveiste lastbærende konstruksjoner',
    });
    requirements.push({
      id: 'material_certificates',
      label: 'Materialsertifikater',
      description: 'EN 10204 3.1 eller 3.2 for strukturelt stål',
      acceptedFormats: ['pdf'],
      required: true,
      reason: 'Påkrevd for lastbærende sveiste konstruksjoner',
    });
  }

  const hasAtex = matches(
    envBlob,
    /eksplosiv|atex|ex-|zone \d|sone \d|støv|gass/i
  );

  if (hasAtex) {
    requirements.push({
      id: 'notified_body_cert',
      label: 'ATEX-sertifikat',
      description: 'Typeeksaminering fra Notified Body for Ex-utstyr',
      directive: '2014/34/EU',
      acceptedFormats: ['pdf'],
      required: true,
      reason: `Installasjonsmiljø indikerer eksplosiv atmosfære: «${installationEnv}»`,
    });
  }

  const hasPressure =
    matches(pressureBlob, /trykk|bar|psi|hydraul|beholder|vessel|trykkbeholder/i) &&
    !matches(driveSystem, /^pneumat/i);

  if (hasPressure) {
    requirements.push({
      id: 'ped_technical_file',
      label: 'PED-teknisk fil / trykkberegning',
      description: 'Beregninger og sertifikater for trykksatt utstyr',
      directive: '2014/68/EU',
      acceptedFormats: ['pdf'],
      required: true,
      reason: 'Maskinen ser ut til å inneholde trykksatt utstyr',
    });
  }

  const hasLifting = matches(
    liftingBlob,
    /løft|kran|heis|wire|kjetting|traverse|løfte/i
  );

  if (hasLifting) {
    requirements.push({
      id: 'load_test_report',
      label: 'Belastningsprøvingsrapport',
      description:
        'Statisk og dynamisk prøvelast (typisk 1.25× og 1.1× nominell last)',
      acceptedFormats: ['pdf'],
      required: true,
      reason: 'Løfteinnretninger krever dokumentert belastningsprøving',
    });
  }

  requirements.push({
    id: 'noise_declaration',
    label: 'Støydeklarasjon / målerapport',
    description: 'Lydtrykk- og lydeffektnivå (EN ISO 11201 eller tilsvarende)',
    acceptedFormats: ['pdf'],
    required: false,
    reason:
      'Anbefalt — støyemisjon skal oppgis i brukerhåndbok (Vedlegg I §1.7.4)',
  });

  return requirements;
}

export function uploadRequirementById(
  id: string,
  project: ProjectInput
): UploadRequirement | undefined {
  return deriveUploadRequirements(project).find((r) => r.id === id);
}
