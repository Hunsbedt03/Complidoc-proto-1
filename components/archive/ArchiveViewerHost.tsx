'use client';

import { useEffect, useState } from 'react';
import { ArchiveDocumentViewer } from '@/components/archive/ArchiveDocumentViewer';
import {
  registerArchiveViewer,
  type ArchiveViewerRequest,
} from '@/lib/archive/viewerBridge';

export function ArchiveViewerHost() {
  const [request, setRequest] = useState<ArchiveViewerRequest | null>(null);

  useEffect(() => {
    return registerArchiveViewer((req) => setRequest(req));
  }, []);

  return (
    <ArchiveDocumentViewer
      request={request}
      onClose={() => setRequest(null)}
    />
  );
}
