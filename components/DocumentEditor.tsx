'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorToolbar } from '@/components/EditorToolbar';
import { SaveRevisionDialog } from '@/components/SaveRevisionDialog';
import { PlSilVerificationBanner } from '@/components/PlSilVerificationBanner';
import { DocumentPaperView } from '@/components/DocumentPaperView';
import type { DocumentExportMeta } from '@/lib/document-model/exportMeta';
import type { ProjectStatus } from '@/lib/projectStatus';

type Props = {
  documentLabel: string;
  initialContent: string;
  initialContentJson?: string;
  documentId?: string;
  paperMeta?: DocumentExportMeta;
  projectStatus: ProjectStatus;
  onSave: (
    content: string,
    contentJson: string,
    changeNote: string
  ) => Promise<void>;
  onCancel: () => void;
  onRegenerate?: () => void;
};

function parseTiptapJson(raw?: string): object | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { type?: string; content?: unknown[] };
    if (parsed.type === 'doc' && Array.isArray(parsed.content) && parsed.content.length > 0) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function DocumentEditor({
  documentLabel,
  initialContent,
  initialContentJson,
  documentId,
  paperMeta,
  projectStatus,
  onSave,
  onCancel,
  onRegenerate,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saveOpen, setSaveOpen] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const editBaselineHtml = useRef(initialContent);
  const editBaselineJson = useRef(initialContentJson ?? '');
  const locked = projectStatus === 'locked';

  const initialEditorContent = useMemo(
    () => (parseTiptapJson(initialContentJson) ?? initialContent) || '<p></p>',
    [initialContent, initialContentJson]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Rediger dokumentinnhold her...',
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialEditorContent,
    editable: mode === 'edit' && !locked,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'doc-paper-prose focus:outline-none min-h-[12rem]',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === 'edit' && !locked);
  }, [editor, mode, locked]);

  useEffect(() => {
    if (!editor || mode !== 'view') return;
    const next = (parseTiptapJson(initialContentJson) ?? initialContent) || '<p></p>';
    editor.commands.setContent(next);
    editBaselineHtml.current = initialContent;
    editBaselineJson.current = initialContentJson ?? '';
  }, [editor, initialContent, initialContentJson, mode]);

  const isDirty = useCallback(() => {
    if (!editor || mode !== 'edit') return false;
    return editor.getHTML() !== editBaselineHtml.current;
  }, [editor, mode]);

  function enterEditMode() {
    editBaselineHtml.current = initialContent || '<p></p>';
    editBaselineJson.current = initialContentJson ?? '';
    setMode('edit');
  }

  function handleCancelEdit() {
    if (isDirty()) {
      const ok = confirm(
        'Du har ulagrede endringer. Avbryte uten å lagre?'
      );
      if (!ok) return;
    }
    const restore = parseTiptapJson(editBaselineJson.current) ?? editBaselineHtml.current;
    editor?.commands.setContent(restore);
    setMode('view');
  }

  async function handleSaveRevision() {
    if (!editor || changeNote.trim().length < 3) return;
    setSaving(true);
    try {
      await onSave(
        editor.getHTML(),
        JSON.stringify(editor.getJSON()),
        changeNote.trim()
      );
      editBaselineHtml.current = editor.getHTML();
      editBaselineJson.current = JSON.stringify(editor.getJSON());
      setSaveOpen(false);
      setChangeNote('');
      setMode('view');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lagring feilet');
    } finally {
      setSaving(false);
    }
  }

  const paper = paperMeta ?? {
    title: documentLabel,
    project: '—',
    machine: '—',
    revision: 1,
    date: new Date().toLocaleDateString('no-NO'),
    documentId,
  };

  const editorBody = (
    <EditorContent editor={editor} className="doc-editor-body doc-editor-body--paper" />
  );

  if (locked) {
    return (
      <div className="doc-editor doc-editor--locked">
        {documentId === 'safety_function_analysis' ? (
          <PlSilVerificationBanner />
        ) : null}
        <DocumentPaperView meta={paper} documentId={documentId}>
          {editorBody}
        </DocumentPaperView>
        <p className="form-info">Prosjektet er låst — redigering er ikke tillatt.</p>
      </div>
    );
  }

  return (
    <div className="doc-editor">
      {documentId === 'safety_function_analysis' ? (
        <PlSilVerificationBanner />
      ) : null}
      <div className="doc-editor-header">
        <p className="doc-editor-title">{documentLabel}</p>
        {mode === 'view' ? (
          <button type="button" className="btn-dl" onClick={enterEditMode}>
            Rediger
          </button>
        ) : (
          <div className="doc-editor-header-actions">
            <button
              type="button"
              className="btn-generate"
              onClick={() => setSaveOpen(true)}
            >
              Lagre
            </button>
            <button type="button" className="btn-cancel" onClick={handleCancelEdit}>
              Avbryt
            </button>
          </div>
        )}
      </div>

      {mode === 'edit' ? <EditorToolbar editor={editor} /> : null}

      <DocumentPaperView meta={paper} documentId={documentId}>
        {editorBody}
      </DocumentPaperView>

      {onRegenerate && mode === 'view' ? (
        <button
          type="button"
          className="btn-cancel doc-editor-regen"
          onClick={() => {
            if (
              confirm(
                'Dette vil erstatte gjeldende innhold med en ny AI-generering. Gjeldende versjon lagres i historikken. Fortsette?'
              )
            ) {
              onRegenerate();
            }
          }}
        >
          Regenerer med AI
        </button>
      ) : null}

      {mode === 'view' ? (
        <button
          type="button"
          className="btn-cancel doc-editor-close"
          onClick={onCancel}
        >
          Lukk
        </button>
      ) : null}

      <SaveRevisionDialog
        open={saveOpen}
        changeNote={changeNote}
        onChangeNote={setChangeNote}
        onCancel={() => !saving && setSaveOpen(false)}
        onConfirm={() => void handleSaveRevision()}
        saving={saving}
      />
    </div>
  );
}
