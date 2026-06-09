'use client';

import { ISO_CERTIFICATION_OPTIONS, type ISOCertification } from '@/lib/documents/types';

type Props = {
  value: ISOCertification[];
  onChange: (next: ISOCertification[]) => void;
};

export function CertificationMultiSelect({ value, onChange }: Props) {
  const selected = new Set(value);

  function toggle(cert: ISOCertification) {
    if (cert === 'none') {
      onChange(['none']);
      return;
    }
    const withoutNone = value.filter((c) => c !== 'none');
    if (selected.has(cert)) {
      const next = withoutNone.filter((c) => c !== cert);
      onChange(next.length ? next : []);
    } else {
      onChange([...withoutNone, cert]);
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Bedriftens sertifiseringer</label>
      <p className="form-card-hint" style={{ marginTop: 0, marginBottom: 8 }}>
        Velg alle gjeldende — systemet tilpasser dokumentkravene
      </p>
      <div className="cert-multiselect">
        {ISO_CERTIFICATION_OPTIONS.map((opt) => {
          const checked = selected.has(opt.value);
          return (
            <label key={opt.value} className="cert-multiselect-option">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
