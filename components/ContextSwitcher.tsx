'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserContext } from '@/lib/user-context/types';
import { dashboardPathForContext } from '@/lib/user-context/types';
import { writeActiveContext } from '@/lib/user-context/client';

type Props = {
  className?: string;
};

export function ContextSwitcher({ className }: Props) {
  const router = useRouter();
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/user/contexts')
      .then((res) => res.json())
      .then((json: { contexts?: UserContext[] }) => {
        setContexts(json.contexts ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || contexts.length < 2) return null;

  const active =
    contexts.find((c) => {
      if (typeof window === 'undefined') return false;
      try {
        const raw = localStorage.getItem('samsiq_active_context');
        if (!raw) return c.type === 'supplier';
        const stored = JSON.parse(raw) as { type?: string; id?: string };
        return stored.type === c.type && stored.id === c.id;
      } catch {
        return c.type === 'supplier';
      }
    }) ?? contexts[0];

  function switchTo(context: UserContext) {
    writeActiveContext({ type: context.type, id: context.id });
    setOpen(false);
    router.push(dashboardPathForContext({ type: context.type, id: context.id }));
    router.refresh();
  }

  return (
    <div className={'context-switcher' + (className ? ` ${className}` : '')}>
      <button
        type="button"
        className="context-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="context-switcher-icon" aria-hidden>
          {active.type === 'supplier' ? '🏭' : '📋'}
        </span>
        <span className="context-switcher-label">
          {active.type === 'supplier' ? 'Leverandør' : 'Kunde'}: {active.name}
        </span>
        <span className="context-switcher-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="context-switcher-menu" role="menu">
          {contexts.map((ctx) => (
            <button
              key={`${ctx.type}-${ctx.id}`}
              type="button"
              role="menuitem"
              className={
                'context-switcher-item' +
                (ctx.type === active.type && ctx.id === active.id ? ' active' : '')
              }
              onClick={() => switchTo(ctx)}
            >
              <span aria-hidden>{ctx.type === 'supplier' ? '🏭' : '📋'}</span>
              {ctx.type === 'supplier' ? 'Leverandør' : 'Kunde'}: {ctx.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
