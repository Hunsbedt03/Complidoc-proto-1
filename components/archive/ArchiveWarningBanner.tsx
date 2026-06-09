'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ExpiringItem = {
  id: string;
  label: string;
  documentTypeId: string;
  version: string;
  daysRemaining: number | null;
};

export function ArchiveWarningBanner() {
  const [items, setItems] = useState<ExpiringItem[]>([]);

  useEffect(() => {
    void fetch('/api/archive/expiring')
      .then((r) => (r.ok ? r.json() : { expiring: [] }))
      .then((json: { expiring?: ExpiringItem[] }) => {
        setItems(json.expiring ?? []);
      })
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <div className="archive-warning-banner">
      <p className="archive-warning-title">
        ⚠️ {items.length} arkivdokument{items.length === 1 ? '' : 'er'} krever
        revurdering snart:
      </p>
      <ul className="archive-warning-list">
        {items.slice(0, 4).map((item) => (
          <li key={item.id}>
            {item.label}
            {item.version ? ` (${item.version})` : ''}
            {item.daysRemaining !== null
              ? ` — ${item.daysRemaining <= 0 ? 'utløpt' : `om ${item.daysRemaining} dager`}`
              : ''}
          </li>
        ))}
      </ul>
      <Link href="/app/archive" className="btn-dl archive-warning-cta">
        Gå til arkivet
      </Link>
    </div>
  );
}
