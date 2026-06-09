import type { ConditionalRule } from './types';
import type { ProjectContext } from './types';

function lc(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function evaluateConditionals(
  project: ProjectContext
): Record<ConditionalRule, boolean> {
  const driveSystem = project.drivsystem ?? '';
  const controlSystem = project.styring ?? '';
  const machineName = project.maskin ?? '';
  const intendedUse = project.tiltenktbruk ?? '';
  const installationEnv = project.installasjonsmiljo ?? '';
  const description = project.beskrivelse ?? '';
  const market = project.marked ?? '';

  const electricBlob = lc(driveSystem, controlSystem, description);
  const envBlob = lc(installationEnv);
  const pressureBlob = lc(machineName, intendedUse, driveSystem, description);
  const liftingBlob = lc(machineName, intendedUse, description);
  const marketBlob = lc(market);

  const hasElectric = matches(
    electricBlob,
    /\d+\s*v|kw|ac|dc|elektrisk|motor|frekvensomformer|plc|styring/i
  );

  const hasAtex = matches(
    envBlob,
    /eksplosiv|atex|ex-|zone \d|sone \d|støv|gass/i
  );

  const hasPressure =
    matches(pressureBlob, /trykk|bar|psi|hydraul|beholder|vessel|trykkbeholder/i) &&
    !matches(driveSystem, /^pneumat/i);

  const hasLifting = matches(
    liftingBlob,
    /løft|kran|heis|wire|kjetting|traverse|løfte/i
  );

  const hasWireless = matches(
    lc(controlSystem, description, machineName),
    /wifi|bluetooth|trådløs|radio|wireless|lte|gsm|nb-iot/i
  );

  const hasDigitalControl = matches(
    lc(controlSystem, description),
    /plc|scada|hmi|digital|nettverk|ethernet|opc|iiot|industri 4/i
  );

  const hasAI = matches(
    lc(description, controlSystem, machineName),
    /\bai\b|maskinlæring|machine learning|neural|kunstig intelligens/i
  );

  const after2027 = new Date().getFullYear() >= 2027;

  return {
    hasElectric,
    hasAtex,
    hasPressure,
    hasLifting,
    hasWireless,
    hasDigitalControl,
    hasAI,
    after2027,
    marketUK: /uk|storbritannia|britain|england/i.test(marketBlob),
    marketUSA: /usa|osha|nord-amerika|united states/i.test(marketBlob),
    marketCanada: /canada|csa/i.test(marketBlob),
    marketAustralia: /australia|new zealand|nz|rcm/i.test(marketBlob),
    marketEurasia: /eurasia|eac|russland|kasakhstan/i.test(marketBlob),
    marketChina: /kina|china|ccc/i.test(marketBlob),
    marketBrazil: /brasil|brazil|inmetro/i.test(marketBlob),
  };
}

export function matchesConditionalRules(
  rules: ConditionalRule[] | undefined,
  project: ProjectContext
): boolean {
  if (!rules?.length) return true;
  const flags = evaluateConditionals(project);
  return rules.every((r) => flags[r]);
}
