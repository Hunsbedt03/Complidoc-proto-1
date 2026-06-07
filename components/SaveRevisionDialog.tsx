'use client';

type Props = {
  open: boolean;
  changeNote: string;
  onChangeNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving?: boolean;
};

export function SaveRevisionDialog({
  open,
  changeNote,
  onChangeNote,
  onCancel,
  onConfirm,
  saving = false,
}: Props) {
  if (!open) return null;

  const trimmed = changeNote.trim();
  const valid = trimmed.length >= 3;

  return (
    <div
      className="lock-dialog-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="lock-dialog"
        role="dialog"
        aria-labelledby="save-revision-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="save-revision-title">Lagre ny revisjon</h3>
        <p className="save-revision-hint">
          Beskriv hva du endret — vises i revisjonsloggen
        </p>
        <input
          className="form-input"
          value={changeNote}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="f.eks. Oppdatert fareidentifikasjon for roterende deler"
          maxLength={120}
          required
          autoFocus
        />
        <div className="lock-dialog-actions">
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={saving}>
            Avbryt
          </button>
          <button
            type="button"
            className="btn-generate"
            disabled={!valid || saving}
            onClick={onConfirm}
          >
            {saving ? 'Lagrer…' : 'Lagre revisjon'}
          </button>
        </div>
      </div>
    </div>
  );
}
