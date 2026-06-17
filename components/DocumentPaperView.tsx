'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildExportInfoRows, type DocumentExportMeta } from '@/lib/document-model/exportMeta';
import { isLandscapeDocument } from '@/lib/document-model/tableLayout';

type Props = {
  meta: DocumentExportMeta;
  documentId?: string;
  children: ReactNode;
  className?: string;
};

const PAPER_WIDTH_MM = { portrait: 210, landscape: 297 } as const;
const PAPER_HEIGHT_MM = { portrait: 297, landscape: 210 } as const;

function mmToPx(mm: number): number {
  return (mm / 25.4) * 96;
}

export function DocumentPaperView({ meta, documentId, children, className }: Props) {
  const resolvedId = documentId ?? meta.documentId;
  const landscape = isLandscapeDocument(resolvedId);
  const paperW = landscape ? PAPER_WIDTH_MM.landscape : PAPER_WIDTH_MM.portrait;
  const paperH = landscape ? PAPER_HEIGHT_MM.landscape : PAPER_HEIGHT_MM.portrait;

  const shellRef = useRef<HTMLDivElement>(null);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [scale, setScale] = useState(1);

  const infoRows = buildExportInfoRows({ ...meta, documentId: resolvedId });

  const measureFitScale = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return 1;
    const style = getComputedStyle(shell);
    const padX =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const available = shell.clientWidth - padX - 8;
    const paperPx = mmToPx(paperW);
    if (available <= 0 || paperPx <= 0) return 1;
    return Math.min(1, available / paperPx);
  }, [paperW]);

  useEffect(() => {
    if (!fitToWidth) return;
    const apply = () => setScale(measureFitScale());
    apply();
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver(apply);
    ro.observe(shell);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [fitToWidth, measureFitScale]);

  function zoomBy(delta: number) {
    setFitToWidth(false);
    setScale((s) => Math.min(1.5, Math.max(0.35, Math.round((s + delta) * 100) / 100)));
  }

  function handleFitToWidth() {
    setFitToWidth(true);
    setScale(measureFitScale());
  }

  const scaledW = paperW * scale;
  const scaledH = paperH * scale;

  return (
    <div
      ref={shellRef}
      className={`doc-paper-shell${className ? ` ${className}` : ''}`}
    >
      <div className="doc-paper-toolbar" role="toolbar" aria-label="Dokumentzoom">
        <button
          type="button"
          className={`doc-paper-toolbar-btn${fitToWidth ? ' doc-paper-toolbar-btn--active' : ''}`}
          onClick={handleFitToWidth}
          title="Tilpass til bredde"
        >
          Tilpass bredde
        </button>
        <button
          type="button"
          className="doc-paper-toolbar-btn"
          onClick={() => zoomBy(-0.1)}
          aria-label="Zoom ut"
        >
          −
        </button>
        <span className="doc-paper-toolbar-zoom">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="doc-paper-toolbar-btn"
          onClick={() => zoomBy(0.1)}
          aria-label="Zoom inn"
        >
          +
        </button>
      </div>
      <div
        className="doc-paper-scale-wrap"
        style={{ width: `${scaledW}mm`, minHeight: `${scaledH}mm` }}
      >
        <div
          className={`doc-paper${landscape ? ' doc-paper--landscape' : ''}`}
          data-document-id={resolvedId}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${paperW}mm`,
            minHeight: `${paperH}mm`,
          }}
        >
          <table className="doc-paper-info-table">
            <tbody>
              {infoRows.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="doc-paper-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
