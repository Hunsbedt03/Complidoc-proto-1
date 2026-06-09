'use client';

import { useEffect, useRef, useState } from 'react';
import { EMPTY_COMPANY_PROFILE } from '@/lib/companyProfile';
import type { CompanyProfile } from '@/lib/types';

type Props = {
  existingProfile?: CompanyProfile | null;
  onSubmit: (profile: CompanyProfile) => Promise<void>;
  onSkip?: () => void;
  submitLabel?: string;
  showSkip?: boolean;
  saving?: boolean;
};

export function CompanyProfileForm({
  existingProfile,
  onSubmit,
  onSkip,
  submitLabel = 'Lagre',
  showSkip = false,
  saving = false,
}: Props) {
  const [profile, setProfile] = useState<CompanyProfile>({
    ...EMPTY_COMPANY_PROFILE,
    ...existingProfile,
    country: existingProfile?.country ?? 'Norge',
  });
  const [logoPreview, setLogoPreview] = useState<string | undefined>(
    existingProfile?.logoUrl
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingProfile) {
      setProfile({
        ...EMPTY_COMPANY_PROFILE,
        ...existingProfile,
        country: existingProfile.country ?? 'Norge',
      });
      setLogoPreview(existingProfile.logoUrl);
    }
  }, [existingProfile]);

  function update<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Logo må være et bilde (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo kan maks være 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setLogoPreview(url);
      update('logoUrl', url);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lagring feilet');
    }
  }

  return (
    <form className="company-profile-form" onSubmit={(e) => void handleSubmit(e)}>
      <p className="form-info company-profile-hint">
        Disse opplysningene brukes automatisk i alle genererte dokumenter.
      </p>

      <div
        className={'logo-drop' + (logoPreview ? ' logo-drop--has' : '')}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleLogoFile(file);
        }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="logo-drop-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoFile(file);
          }}
        />
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt="Bedriftslogo" className="logo-drop-preview" />
        ) : (
          <span className="logo-drop-text">Dra logo hit eller klikk for å laste opp (valgfritt)</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Bedriftsnavn *</label>
          <input
            className="form-input"
            required
            value={profile.companyName}
            onChange={(e) => update('companyName', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Org.nr *</label>
          <input
            className="form-input"
            required
            value={profile.orgNumber}
            onChange={(e) => update('orgNumber', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Adresse *</label>
        <input
          className="form-input"
          required
          value={profile.address}
          onChange={(e) => update('address', e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Postnummer *</label>
          <input
            className="form-input"
            required
            value={profile.postalCode}
            onChange={(e) => update('postalCode', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Poststed *</label>
          <input
            className="form-input"
            required
            value={profile.city}
            onChange={(e) => update('city', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Land *</label>
          <input
            className="form-input"
            required
            value={profile.country}
            onChange={(e) => update('country', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Telefon *</label>
          <input
            className="form-input"
            required
            value={profile.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Ansvarlig ingeniør *</label>
          <input
            className="form-input"
            required
            value={profile.responsibleEngineer}
            onChange={(e) => update('responsibleEngineer', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Stillingstittel *</label>
          <input
            className="form-input"
            required
            placeholder="f.eks. Prosjektingeniør"
            value={profile.engineerTitle}
            onChange={(e) => update('engineerTitle', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nettside</label>
        <input
          className="form-input"
          type="url"
          placeholder="https://"
          value={profile.website ?? ''}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="onboarding-actions">
        {showSkip && onSkip ? (
          <button type="button" className="btn-cancel" onClick={onSkip} disabled={saving}>
            Hopp over for nå
          </button>
        ) : null}
        <button type="submit" className="btn-generate" disabled={saving}>
          {saving ? 'Lagrer…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
