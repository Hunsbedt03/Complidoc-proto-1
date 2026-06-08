import type { CompanyProfile } from '@/lib/types';

export function buildCompanyContextBlock(profile: CompanyProfile): string {
  const lines = [
    'Produsentinformasjon (bruk nøyaktig som oppgitt):',
    `- Bedrift: ${profile.companyName}`,
    profile.orgNumber ? `- Org.nr: ${profile.orgNumber}` : null,
    profile.address
      ? `- Adresse: ${profile.address}, ${profile.postalCode} ${profile.city}`
      : null,
    profile.country ? `- Land: ${profile.country}` : null,
    profile.responsibleEngineer
      ? `- Ansvarlig person: ${profile.responsibleEngineer}`
      : null,
    profile.engineerTitle ? `- Stilling: ${profile.engineerTitle}` : null,
    profile.phone ? `- Telefon: ${profile.phone}` : null,
    profile.website ? `- Nettside: ${profile.website}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function appendCompanyContext(
  machineData: string,
  profile: CompanyProfile | null | undefined
): string {
  if (!profile?.companyName?.trim()) return machineData;
  return `${machineData}\n\n=== PRODUSENT / BEDRIFT ===\n${buildCompanyContextBlock(profile)}`;
}

export type DbCompanyProfile = {
  id: string;
  user_id: string;
  company_name: string;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  responsible_engineer: string | null;
  engineer_title: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
};

export function mapDbToCompanyProfile(row: DbCompanyProfile): CompanyProfile {
  return {
    companyName: row.company_name,
    orgNumber: row.org_number ?? '',
    address: row.address ?? '',
    postalCode: row.postal_code ?? '',
    city: row.city ?? '',
    country: row.country ?? 'Norge',
    responsibleEngineer: row.responsible_engineer ?? '',
    engineerTitle: row.engineer_title ?? '',
    phone: row.phone ?? '',
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
  };
}

export function mapCompanyProfileToDb(
  userId: string,
  profile: CompanyProfile
): Omit<DbCompanyProfile, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    company_name: profile.companyName.trim(),
    org_number: profile.orgNumber.trim() || null,
    address: profile.address.trim() || null,
    postal_code: profile.postalCode.trim() || null,
    city: profile.city.trim() || null,
    country: profile.country.trim() || 'Norge',
    responsible_engineer: profile.responsibleEngineer.trim() || null,
    engineer_title: profile.engineerTitle.trim() || null,
    phone: profile.phone.trim() || null,
    website: profile.website?.trim() || null,
    logo_url: profile.logoUrl || null,
  };
}

export function validateCompanyProfile(
  profile: CompanyProfile,
  requireAll = true
): string | null {
  if (!profile.companyName.trim()) return 'Bedriftsnavn er påkrevd';
  if (!requireAll) return null;
  if (!profile.orgNumber.trim()) return 'Organisasjonsnummer er påkrevd';
  if (!profile.address.trim()) return 'Adresse er påkrevd';
  if (!profile.postalCode.trim()) return 'Postnummer er påkrevd';
  if (!profile.city.trim()) return 'Poststed er påkrevd';
  if (!profile.responsibleEngineer.trim()) return 'Ansvarlig ingeniør er påkrevd';
  if (!profile.engineerTitle.trim()) return 'Stillingstittel er påkrevd';
  if (!profile.phone.trim()) return 'Telefon er påkrevd';
  return null;
}

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
  orgNumber: '',
  address: '',
  postalCode: '',
  city: '',
  country: 'Norge',
  responsibleEngineer: '',
  engineerTitle: '',
  phone: '',
};
