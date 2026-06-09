import type { CompanyCertification, CompanyProfile } from '@/lib/types';
import type { ISOCertification } from '@/lib/documents/types';
import { ISO_CERTIFICATION_OPTIONS } from '@/lib/documents/types';

export const INDUSTRY_SECTOR_OPTIONS = [
  { value: 'offshore_maritime', label: 'Offshore / Maritim' },
  { value: 'aquaculture', label: 'Havbruk / Akvakultur' },
  { value: 'hydropower', label: 'Vannkraft' },
  { value: 'food_processing', label: 'Næringsmiddel / Prosess' },
  { value: 'automotive', label: 'Bilindustri' },
  { value: 'aerospace', label: 'Luftfart / Forsvar' },
  { value: 'construction', label: 'Bygg og anlegg' },
  { value: 'mining', label: 'Bergverk / Gruvedrift' },
  { value: 'pharma', label: 'Farmasi / Medisin' },
  { value: 'general_manufacturing', label: 'Generell industri' },
  { value: 'other', label: 'Annet' },
] as const;

export const MACHINE_TYPE_OPTIONS = [
  { value: 'conveyor', label: 'Transportbånd / Konveyorer' },
  { value: 'pump', label: 'Pumper' },
  { value: 'crane_hoist', label: 'Kraner / Heiseutstyr' },
  { value: 'press', label: 'Presser' },
  { value: 'robot', label: 'Roboter / Manipulatorer' },
  { value: 'mixer_agitator', label: 'Miksere / Røreverk' },
  { value: 'screen_filter', label: 'Siler / Filtre' },
  { value: 'compressor', label: 'Kompressorer' },
  { value: 'cutting_machine', label: 'Kuttmaskiner' },
  { value: 'packaging', label: 'Emballasjemaskiner' },
  { value: 'special_purpose', label: 'Spesialmaskiner' },
] as const;

export const INSTALLATION_ENV_OPTIONS = [
  { value: 'indoor_dry', label: 'Innendørs, tørt' },
  { value: 'indoor_wet', label: 'Innendørs, fuktig' },
  { value: 'outdoor', label: 'Utendørs' },
  { value: 'explosive_atmosphere', label: 'Eksplosiv atmosfære (ATEX)' },
  { value: 'food_grade', label: 'Næringsmiddelgodkjent' },
  { value: 'offshore', label: 'Offshore / Marin' },
  { value: 'high_temperature', label: 'Høy temperatur' },
  { value: 'corrosive', label: 'Korrosivt miljø' },
] as const;

export const PRIMARY_MARKET_OPTIONS = [
  { value: 'eu_eea', label: 'EU / EØS (CE-merking)' },
  { value: 'uk', label: 'Storbritannia (UKCA)' },
  { value: 'usa', label: 'USA (UL / OSHA)' },
  { value: 'canada', label: 'Canada (CSA)' },
  { value: 'australia_nz', label: 'Australia / New Zealand (RCM)' },
  { value: 'russia_eurasia', label: 'Eurasia (EAC)' },
  { value: 'china', label: 'Kina (CCC)' },
  { value: 'brazil', label: 'Brasil (INMETRO)' },
] as const;

export const HARMONIZED_STANDARDS = [
  'EN ISO 12100',
  'EN ISO 13849',
  'EN 60204-1',
  'EN ISO 14119',
  'EN ISO 13850',
  'EN ISO 13857',
  'EN 62061',
  'EN ISO 4414',
  'EN ISO 4413',
  'EN 1672-2',
  'EN 1672-1',
  'EN 60204-1',
  'EN ISO 11161',
  'EN 349',
].map((s) => ({ value: s, label: s }));

export const COMPANY_CERTIFICATION_OPTIONS = [
  ...ISO_CERTIFICATION_OPTIONS.filter((o) => o.value !== 'none'),
  { value: 'iso_50001' as const, label: 'ISO 50001 — Energiledelse' },
  { value: 'iso_22000' as const, label: 'ISO 22000 — Næringsmiddeltrygghet' },
];

export const ISO_LABELS: Record<string, string> = Object.fromEntries(
  COMPANY_CERTIFICATION_OPTIONS.map((o) => [o.value, o.label])
);

const ISO_SCOPE_STANDARDS = new Set<ISOCertification>([
  'iso_9001',
  'iso_14001',
  'iso_45001',
  'iso_13485',
  'iso_27001',
  'iatf_16949',
  'as9100',
]);

/** Standarder som styrer dokumentkrav / arkiv-filtrering. */
export function profileIsoStandards(
  certifications: CompanyCertification[] = []
): ISOCertification[] {
  return certifications
    .map((c) => c.standard)
    .filter((s): s is ISOCertification => ISO_SCOPE_STANDARDS.has(s as ISOCertification));
}

export function calculateProfileCompleteness(profile: CompanyProfile): {
  percent: number;
  missingFields: string[];
} {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Bedriftsnavn', ok: !!profile.companyName?.trim() },
    { label: 'Organisasjonsnummer', ok: !!profile.orgNumber?.trim() },
    { label: 'Adresse', ok: !!profile.address?.trim() },
    { label: 'Ansvarlig ingeniør', ok: !!profile.responsibleEngineer?.trim() },
    { label: 'Bransje', ok: !!profile.industrySector },
    { label: 'Typiske maskintyper', ok: (profile.typicalMachineTypes?.length ?? 0) > 0 },
    { label: 'Primærmarkeder', ok: (profile.primaryMarkets?.length ?? 0) > 0 },
    { label: 'ISO-sertifiseringer', ok: (profile.certifications?.length ?? 0) > 0 },
    { label: 'Logo', ok: !!profile.logoUrl },
    { label: 'Telefon', ok: !!profile.phone?.trim() },
  ];

  const filled = checks.filter((c) => c.ok).length;
  const missingFields = checks.filter((c) => !c.ok).map((c) => c.label);
  return {
    percent: Math.round((filled / checks.length) * 100),
    missingFields,
  };
}

export function isCertExpiringSoon(
  expiryDate?: string,
  withinDays = 90
): boolean {
  if (!expiryDate) return false;
  const end = new Date(expiryDate).getTime();
  if (Number.isNaN(end)) return false;
  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  return days <= withinDays && days >= 0;
}

export function getExpiringCertifications(
  certifications: CompanyCertification[] = [],
  withinDays = 90
): CompanyCertification[] {
  return certifications.filter((c) => isCertExpiringSoon(c.expiryDate, withinDays));
}

export function projectDefaultsFromProfile(
  profile: CompanyProfile | null | undefined
): {
  marked: string;
  installasjonsmiljo: string;
  ingenior: string;
  standarder: string;
  certifications: ISOCertification[];
  produsent: string;
} {
  if (!profile) {
    return {
      marked: 'EU / EØS — Norge',
      installasjonsmiljo: '',
      ingenior: '',
      standarder: '',
      certifications: [],
      produsent: '',
    };
  }

  return {
    produsent: profile.companyName ?? '',
    marked: profile.defaultMarket ?? 'EU / EØS — Norge',
    installasjonsmiljo: profile.defaultInstallationEnv ?? '',
    ingenior:
      profile.defaultResponsibleEngineer ??
      profile.responsibleEngineer ??
      '',
    standarder: (profile.preferredStandards ?? []).join(', '),
    certifications: profileIsoStandards(profile.certifications),
  };
}
