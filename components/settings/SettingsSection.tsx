'use client';

import type { ReactNode } from 'react';

type Props = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  saveLabel?: string;
};

export function SettingsSection({
  id,
  title,
  description,
  children,
  onSave,
  saving = false,
  saved = false,
  saveLabel = 'Lagre seksjon',
}: Props) {
  return (
    <section className="settings-section" id={id}>
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">{title}</h2>
          {description ? <p className="form-info">{description}</p> : null}
        </div>
        {onSave ? (
          <button
            type="button"
            className="btn-dl"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? 'Lagrer…' : saveLabel}
          </button>
        ) : null}
      </div>
      {saved ? <p className="settings-saved">Lagret.</p> : null}
      <div className="settings-section-body">{children}</div>
    </section>
  );
}
