'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CompanyProfileForm } from '@/components/CompanyProfileForm';
import { CertificationManager } from '@/components/settings/CertificationManager';
import { ProfileCompleteness } from '@/components/settings/ProfileCompleteness';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { EMPTY_COMPANY_PROFILE } from '@/lib/companyProfile';
import {
  HARMONIZED_STANDARDS,
  INDUSTRY_SECTOR_OPTIONS,
  INSTALLATION_ENV_OPTIONS,
  MACHINE_TYPE_OPTIONS,
  PRIMARY_MARKET_OPTIONS,
  calculateProfileCompleteness,
} from '@/lib/companyProfile/extended';
import type { CompanyProfile } from '@/lib/types';

async function saveProfile(
  profile: CompanyProfile,
  section: string
): Promise<CompanyProfile> {
  const res = await fetch('/api/company-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      skipValidation: section !== 'basic',
    }),
  });
  const json = (await res.json()) as { profile?: CompanyProfile; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Lagring feilet');
  return json.profile ?? profile;
}

type Props = {
  initialProfile: CompanyProfile | null;
  loading: boolean;
};

export function ExtendedCompanySettings({ initialProfile, loading }: Props) {
  const [profile, setProfile] = useState<CompanyProfile>({
    ...EMPTY_COMPANY_PROFILE,
    ...initialProfile,
  });
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile({ ...EMPTY_COMPANY_PROFILE, ...initialProfile });
    }
  }, [initialProfile]);

  const completeness = useMemo(
    () => calculateProfileCompleteness(profile),
    [profile]
  );

  const persist = useCallback(
    async (section: string, next: CompanyProfile) => {
      setSavingSection(section);
      setSavedSection(null);
      try {
        const saved = await saveProfile(next, section);
        setProfile(saved);
        setSavedSection(section);
        setTimeout(() => setSavedSection(null), 3000);
      } finally {
        setSavingSection(null);
      }
    },
    []
  );

  if (loading) {
    return <p className="form-info">Laster…</p>;
  }

  return (
    <div className="extended-settings">
      <ProfileCompleteness
        percent={completeness.percent}
        missingFields={completeness.missingFields}
      />

      <SettingsSection
        title="Bedriftsinformasjon"
        description="Grunnleggende opplysninger brukt i alle genererte dokumenter."
      >
        <CompanyProfileForm
          existingProfile={profile}
          saving={savingSection === 'basic'}
          submitLabel="Lagre grunninfo"
          onSubmit={async (p) => {
            const next = { ...profile, ...p };
            setProfile(next);
            await persist('basic', next);
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Bransje og produksjon"
        description="Hjelper systemet å forhåndsutfylle nye prosjekter riktig."
        onSave={() => void persist('industry', profile)}
        saving={savingSection === 'industry'}
        saved={savedSection === 'industry'}
      >
        <div className="form-group">
          <label className="form-label">Bransje</label>
          <select
            className="form-input"
            value={profile.industrySector ?? ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                industrySector: e.target.value || undefined,
              }))
            }
          >
            <option value="">Velg bransje…</option>
            {INDUSTRY_SECTOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <MultiSelect
          label="Typiske maskintyper bedriften produserer"
          hint="Brukes til å foreslå relevante standarder automatisk"
          options={MACHINE_TYPE_OPTIONS}
          value={profile.typicalMachineTypes ?? []}
          onChange={(v) =>
            setProfile((p) => ({ ...p, typicalMachineTypes: v }))
          }
        />
        <MultiSelect
          label="Typiske installasjonsmiljøer"
          options={INSTALLATION_ENV_OPTIONS}
          value={profile.typicalInstallationEnv ?? []}
          onChange={(v) =>
            setProfile((p) => ({ ...p, typicalInstallationEnv: v }))
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Markeder"
        description="Bestemmer hvilke direktiver og sertifiseringer som kreves."
        onSave={() => void persist('markets', profile)}
        saving={savingSection === 'markets'}
        saved={savedSection === 'markets'}
      >
        <MultiSelect
          label="Primærmarkeder"
          hint="Dokumentkrav tilpasses automatisk for valgte markeder"
          options={PRIMARY_MARKET_OPTIONS}
          value={profile.primaryMarkets ?? ['eu_eea']}
          onChange={(v) =>
            setProfile((p) => ({
              ...p,
              primaryMarkets: v.length ? v : ['eu_eea'],
            }))
          }
        />
      </SettingsSection>

      <SettingsSection
        id="certifications"
        title="ISO-sertifiseringer"
        description="Legg til og oppdater sertifiseringer. Systemet viser kun relevante dokumentkrav."
        onSave={() => void persist('certifications', profile)}
        saving={savingSection === 'certifications'}
        saved={savedSection === 'certifications'}
      >
        <CertificationManager
          certifications={profile.certifications ?? []}
          onChange={(certs) =>
            setProfile((p) => ({ ...p, certifications: certs }))
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Standardverdier for nye prosjekter"
        description="Disse verdiene forhåndsutfylles automatisk — du kan alltid overstyre per prosjekt."
        onSave={() => void persist('defaults', profile)}
        saving={savingSection === 'defaults'}
        saved={savedSection === 'defaults'}
      >
        <div className="form-group">
          <label className="form-label">Standard ansvarlig ingeniør</label>
          <input
            className="form-input"
            placeholder="Fullt navn"
            value={profile.defaultResponsibleEngineer ?? ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                defaultResponsibleEngineer: e.target.value,
              }))
            }
          />
        </div>
        <div className="form-group">
          <label className="form-label">Standard marked</label>
          <input
            className="form-input"
            placeholder="f.eks. EU / EØS — Norge"
            value={profile.defaultMarket ?? ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, defaultMarket: e.target.value }))
            }
          />
        </div>
        <div className="form-group">
          <label className="form-label">Standard installasjonsmiljø</label>
          <input
            className="form-input"
            placeholder="f.eks. Innendørs, fuktig"
            value={profile.defaultInstallationEnv ?? ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                defaultInstallationEnv: e.target.value,
              }))
            }
          />
        </div>
        <MultiSelect
          label="Foretrukne standarder"
          hint="Foreslås automatisk i nye prosjekter"
          options={HARMONIZED_STANDARDS}
          value={profile.preferredStandards ?? []}
          onChange={(v) =>
            setProfile((p) => ({ ...p, preferredStandards: v }))
          }
        />
      </SettingsSection>
    </div>
  );
}
