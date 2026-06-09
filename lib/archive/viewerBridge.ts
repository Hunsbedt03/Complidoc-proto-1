export type ArchiveViewerRequest = {
  archiveId: string;
  filePath?: string;
  mimeType?: string;
  fileName?: string;
  label?: string;
};

type OpenHandler = (req: ArchiveViewerRequest) => void;

let openHandler: OpenHandler | null = null;

export function registerArchiveViewer(handler: OpenHandler) {
  openHandler = handler;
  return () => {
    if (openHandler === handler) openHandler = null;
  };
}

export function requestArchiveViewer(req: ArchiveViewerRequest) {
  openHandler?.(req);
}
