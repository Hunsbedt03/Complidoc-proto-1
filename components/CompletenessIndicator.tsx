'use client';

import {
  getCompletenessSummary,
  getCompletenessTone,
  type PackageCompleteness,
} from '@/lib/documents/completeness';
import type { ProjectStatus } from '@/lib/projectStatus';

type Props = {
  completeness: PackageCompleteness;
  projectStatus: ProjectStatus;
  generating?: boolean;
};

export function CompletenessIndicator({
  completeness,
  projectStatus,
  generating = false,
}: Props) {
  const tone = getCompletenessTone(
    completeness.percent,
    generating,
    completeness.isComplete
  );
  const summary = getCompletenessSummary(
    completeness,
    projectStatus,
    generating
  );

  return (
    <div className={`completeness-indicator completeness-indicator--${tone}`}>
      <div className="completeness-indicator-head">
        <span className="completeness-indicator-title">Teknisk fil</span>
        <span className="completeness-indicator-pct">
          {completeness.complete}/{completeness.total} · {completeness.percent}%
        </span>
      </div>
      <div className="completeness-indicator-track">
        <div
          className="completeness-indicator-fill"
          style={{ width: `${completeness.percent}%` }}
        />
      </div>
      <p className="completeness-indicator-summary">{summary}</p>
      {completeness.missingRequired.length > 0 && projectStatus !== 'locked' ? (
        <p className="completeness-indicator-hint">
          Nedlasting er alltid tillatt. Utkast-ZIP inkluderer MANGLER.txt.
        </p>
      ) : null}
    </div>
  );
}

export function CompletenessBar({ percent }: { percent: number }) {
  const tone =
    percent >= 100 ? 'green' : percent >= 50 ? 'yellow' : percent > 0 ? 'blue' : 'gray';
  return (
    <div className={`completeness-mini completeness-mini--${tone}`}>
      <div className="completeness-mini-track">
        <div className="completeness-mini-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="completeness-mini-label">{percent}%</span>
    </div>
  );
}
