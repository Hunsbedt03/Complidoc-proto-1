'use client';

type Option = { value: string; label: string };

type Props = {
  label: string;
  hint?: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function MultiSelect({
  label,
  hint,
  options,
  value,
  onChange,
  disabled = false,
}: Props) {
  const selected = new Set(value);

  function toggle(v: string) {
    if (disabled) return;
    if (selected.has(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {hint ? <p className="form-card-hint">{hint}</p> : null}
      <div className="cert-multiselect">
        {options.map((opt) => (
          <label key={opt.value} className="cert-multiselect-option">
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              disabled={disabled}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
