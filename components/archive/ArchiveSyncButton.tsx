'use client';

import { useState } from 'react';
import { fetchSyncedArchiveLinks } from '@/lib/archive/clientSync';
import type { ArchiveSyncDebug } from '@/lib/archive/syncLinks';
import type { ProjectArchiveLink, ProjectFormData } from '@/lib/types';

type Props = {
  projectId: string | null;
  form: ProjectFormData;
  onLinksUpdated: (links: ProjectArchiveLink[]) => void;
  disabled?: boolean;
};

export function ArchiveSyncButton({
  projectId,
  form,
  onLinksUpdated,
  disabled = false,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debug, setDebug] = useState<ArchiveSyncDebug | null>(null);

  async function handleSync() {
    if (!projectId) return;
    setSyncing(true);
    setMessage(null);
    setDebug(null);

    try {
      const { links, debug: syncDebug } = await fetchSyncedArchiveLinks(
        projectId,
        form
      );
      setDebug(syncDebug ?? null);
      onLinksUpdated(links);

      const qmLinked = links.some(
        (l) => l.documentTypeId.trim().toLowerCase() === 'quality_manual'
      );
      const qmInArchive =
        syncDebug?.archiveRowsFound?.quality_manual === true ||
        syncDebug?.archiveFirstTypeIds?.includes('quality_manual');

      if (qmLinked) {
        setMessage('Synkronisert — kvalitetshåndbok koblet fra arkiv.');
      } else if (qmInArchive) {
        setMessage(
          'Arkivet har kvalitetshåndbok, men kobling feilet — se diagnose under.'
        );
      } else if ((syncDebug?.eligibleTypeIds?.length ?? 0) === 0) {
        setMessage(
          'Ingen arkiv-berettigede dokumenttyper i prosjektet (sjekk ISO-sertifiseringer).'
        );
      } else {
        setMessage(
          `Synkronisert ${links.length} kobling(er). Kvalitetshåndbok ikke funnet i arkiv for company_id ${syncDebug?.companyProfileId ?? '?'}.`
        );
      }

    } catch {
      setMessage('Synkronisering feilet — prøv igjen.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="archive-sync-block">
      <button
        type="button"
        className="btn-cancel archive-sync-btn"
        disabled={disabled || syncing || !projectId}
        onClick={() => void handleSync()}
      >
        {syncing ? 'Synkroniserer…' : 'Synkroniser med arkiv'}
      </button>
      {message ? <p className="archive-sync-msg">{message}</p> : null}
      {debug ? (
        <details className="archive-sync-debug">
          <summary>Diagnose (auto-link)</summary>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
