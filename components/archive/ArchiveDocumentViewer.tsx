'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState } from 'react';
import { EditorToolbar } from '@/components/EditorToolbar';
import { getLocalArchiveFileBase64 } from '@/lib/localArchive';
import type { ArchiveViewerRequest } from '@/lib/archive/viewerBridge';

type Props = {
  request: ArchiveViewerRequest | null;
  onClose: () => void;
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'pdf'; url: string; label: string; fileName: string }
  | { status: 'docx'; html: string; label: string; fileName: string }
  | { status: 'error'; message: string };

function isPdf(mime?: string, fileName?: string): boolean {
  return (
    mime === 'application/pdf' ||
    (fileName?.toLowerCase().endsWith('.pdf') ?? false)
  );
}

function isDocx(mime?: string, fileName?: string): boolean {
  const name = fileName?.toLowerCase() ?? '';
  return (
    mime?.includes('wordprocessingml') === true ||
    mime === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  );
}

export function ArchiveDocumentViewer({ request, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: 'Rediger dokumentinnhold…' }),
    ],
    content: '<p></p>',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-64 p-4',
      },
    },
  });

  useEffect(() => {
    if (!request) return;
    setMode('view');
    setPreview({ status: 'loading' });

    let cancelled = false;

    void (async () => {
      try {
        if (request.filePath?.startsWith('local://')) {
          const base64 = getLocalArchiveFileBase64(request.archiveId);
          if (!base64) {
            if (!cancelled) {
              setPreview({ status: 'error', message: 'Fant ikke filen lokalt.' });
            }
            return;
          }

          if (isPdf(request.mimeType, request.fileName)) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            if (!cancelled) {
              setPreview({
                status: 'pdf',
                url,
                label: request.label ?? request.fileName ?? 'Dokument',
                fileName: request.fileName ?? 'document.pdf',
              });
            }
            return;
          }

          if (isDocx(request.mimeType, request.fileName)) {
            const mammoth = await import('mammoth');
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const result = await mammoth.convertToHtml({
              arrayBuffer: bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength
              ),
            });
            if (!cancelled) {
              setPreview({
                status: 'docx',
                html: result.value,
                label: request.label ?? request.fileName ?? 'Dokument',
                fileName: request.fileName ?? 'document.docx',
              });
            }
            return;
          }

          if (!cancelled) {
            setPreview({
              status: 'error',
              message: 'Forhåndsvisning støttes kun for PDF og DOCX.',
            });
          }
          return;
        }

        const res = await fetch(
          `/api/archive/preview?id=${encodeURIComponent(request.archiveId)}`
        );
        const json = (await res.json()) as {
          mode?: 'pdf' | 'docx';
          url?: string;
          html?: string;
          label?: string;
          fileName?: string;
          error?: string;
        };

        if (!res.ok || json.error) {
          if (!cancelled) {
            setPreview({
              status: 'error',
              message: json.error ?? 'Kunne ikke laste dokumentet.',
            });
          }
          return;
        }

        if (json.mode === 'pdf' && json.url) {
          if (!cancelled) {
            setPreview({
              status: 'pdf',
              url: json.url,
              label: json.label ?? request.label ?? 'Dokument',
              fileName: json.fileName ?? request.fileName ?? 'document.pdf',
            });
          }
          return;
        }

        if (json.mode === 'docx' && json.html) {
          if (!cancelled) {
            setPreview({
              status: 'docx',
              html: json.html,
              label: json.label ?? request.label ?? 'Dokument',
              fileName: json.fileName ?? request.fileName ?? 'document.docx',
            });
          }
          return;
        }

        if (!cancelled) {
          setPreview({ status: 'error', message: 'Ukjent dokumentformat.' });
        }
      } catch {
        if (!cancelled) {
          setPreview({ status: 'error', message: 'Kunne ikke laste dokumentet.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    if (!editor || preview.status !== 'docx') return;
    editor.commands.setContent(preview.html || '<p></p>');
    editor.setEditable(mode === 'edit');
  }, [editor, preview, mode]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!request) return null;

  return (
    <div className="archive-viewer-backdrop" onClick={handleBackdrop} role="presentation">
      <div className="archive-viewer" role="dialog" aria-modal="true">
        <div className="archive-viewer-header">
          <div>
            <h3 className="archive-viewer-title">
              {preview.status === 'pdf' || preview.status === 'docx'
                ? preview.label
                : request.label ?? request.fileName ?? 'Dokument'}
            </h3>
            {preview.status === 'pdf' || preview.status === 'docx' ? (
              <p className="archive-viewer-meta">{preview.fileName}</p>
            ) : null}
          </div>
          <div className="archive-viewer-header-actions">
            {preview.status === 'docx' && mode === 'view' ? (
              <button
                type="button"
                className="btn-dl"
                onClick={() => setMode('edit')}
              >
                Rediger
              </button>
            ) : null}
            {preview.status === 'docx' && mode === 'edit' ? (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  if (preview.status === 'docx') {
                    editor?.commands.setContent(preview.html || '<p></p>');
                  }
                  setMode('view');
                }}
              >
                Avslutt redigering
              </button>
            ) : null}
            <button type="button" className="btn-cancel" onClick={onClose}>
              Lukk
            </button>
          </div>
        </div>

        <div className="archive-viewer-body">
          {preview.status === 'loading' ? (
            <p className="archive-viewer-loading">Laster dokument…</p>
          ) : null}
          {preview.status === 'error' ? (
            <p className="archive-viewer-error">{preview.message}</p>
          ) : null}
          {preview.status === 'pdf' ? (
            <iframe
              className="archive-viewer-pdf"
              src={preview.url}
              title={preview.label}
            />
          ) : null}
          {preview.status === 'docx' ? (
            <div className="archive-viewer-docx">
              {mode === 'edit' ? <EditorToolbar editor={editor} /> : null}
              <EditorContent editor={editor} className="doc-editor-body" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
