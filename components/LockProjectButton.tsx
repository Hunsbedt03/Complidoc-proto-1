'use client';

import { useState } from 'react';
import type { PackageCompleteness } from '@/lib/documents/completeness';
import type { ProjectStatus } from '@/lib/projectStatus';

type Props = {
  projectStatus: ProjectStatus;
  completeness: PackageCompleteness;
  engineerName: string;
  onLock: () => void;
};

export function LockProjectButton({
  projectStatus,
  completeness,
  engineerName,
  onLock,
}: Props) {
  const [open, setOpen] = useState(false);
  const missingCount = completeness.missingRequired.length;
  const disabled =
    projectStatus === 'locked' || !completeness.isComplete;

  if (projectStatus === 'locked') {
    return (
      <div className="lock-project lock-project--done">
        <span className="lock-project-icon">✓</span>
        <span>Prosjektet er godkjent og låst</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn-lock-project"
        disabled={disabled}
        title={
          disabled
            ? `Last opp ${missingCount} dokument(er) for å låse pakken`
            : 'Lås og signer den tekniske filen'
        }
        onClick={() => setOpen(true)}
      >
        Lås og godkjenn
      </button>

      {open ? (
        <div
          className="lock-dialog-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="lock-dialog"
            role="dialog"
            aria-labelledby="lock-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="lock-dialog-title">Lås dokumentpakken?</h3>
            <p className="lock-dialog-lead">
              Er du sikker på at du vil låse denne dokumentpakken?
            </p>
            <ul className="lock-dialog-checks">
              <li>
                ✓ {completeness.complete}/{completeness.total} dokumenter er på
                plass
              </li>
              <li>✓ Ansvarlig ingeniør: {engineerName || 'Ikke oppgitt'}</li>
              <li>✓ Dato: {new Date().toLocaleDateString('nb-NO')}</li>
            </ul>
            <p className="lock-dialog-note">
              Etter låsing kan ingenting endres. Pakken arkiveres og markeres som
              godkjent.
            </p>
            <div className="lock-dialog-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setOpen(false)}
              >
                Avbryt
              </button>
              <button
                type="button"
                className="btn-generate"
                onClick={() => {
                  onLock();
                  setOpen(false);
                }}
              >
                Lås og godkjenn →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
