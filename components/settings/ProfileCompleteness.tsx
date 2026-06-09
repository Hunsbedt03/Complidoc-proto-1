'use client';

type Props = {
  percent: number;
  missingFields: string[];
};

export function ProfileCompleteness({ percent, missingFields }: Props) {
  return (
    <div className="profile-completeness">
      <div className="profile-completeness-head">
        <span className="profile-completeness-label">Profil-kompletthet</span>
        <span className="profile-completeness-pct">{percent}%</span>
      </div>
      <div className="completeness-category-track">
        <div
          className="completeness-category-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {percent < 100 ? (
        <p className="form-info profile-completeness-hint">
          Fyll ut profilen for bedre automatisk forhåndsutfylling av prosjekter.
        </p>
      ) : (
        <p className="profile-completeness-ok">✓ Profilen er komplett</p>
      )}
      {missingFields.length > 0 ? (
        <ul className="profile-completeness-missing">
          {missingFields.map((field) => (
            <li key={field}>• {field} mangler</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
