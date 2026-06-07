'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorToolbar } from '@/components/EditorToolbar';
import { SaveRevisionDialog } from '@/components/SaveRevisionDialog';
import type { ProjectStatus } from '@/lib/projectStatus';

type Props = {
  documentLabel: string;
  initialContent: string;
  projectStatus: ProjectStatus;
  onSave: (
    content: string,
    contentJson: string,
    changeNote: string
  ) => Promise<void>;
  onCancel: () => void;
  onRegenerate?: () => void;
};

export function DocumentEditor({
  documentLabel,
  initialContent,
  projectStatus,
  onSave,
  onCancel,
  onRegenerate,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saveOpen, setSaveOpen] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const editBaseline = useRef(initialContent);
  const locked = projectStatus === 'locked';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Rediger dokumentinnhold her...',
      }),
    ],
    content: initialContent || '<p></p>',
    editable: mode === 'edit' && !locked,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-64 p-4',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === 'edit' && !locked);
  }, [editor, mode, locked]);

  useEffect(() => {
    if (!editor || mode !== 'view') return;
    editor.commands.setContent(initialContent || '<p></p>');
  }, [editor, initialContent, mode]);

  const isDirty = useCallback(() => {
    if (!editor || mode !== 'edit') return false;
    return editor.getHTML() !== editBaseline.current;
  }, [editor, mode]);

  function enterEditMode() {
    editBaseline.current = initialContent || '<p></p>';
    setMode('edit');
  }

  function handleCancelEdit() {
    if (isDirty()) {
      const ok = confirm(
        'Du har ulagrede endringer. Avbryte uten å lagre?'
      );
      if (!ok) return;
    }
    editor?.commands.setContent(editBaseline.current);
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
      editBaseline.current = editor.getHTML();
      setSaveOpen(false);
      setChangeNote('');
      setMode('view');
    } finally {
      setSaving(false);
    }
  }

  if (locked) {
    return (
      <div className="doc-editor doc-editor--locked">
        <EditorContent editor={editor} className="doc-editor-body" />
        <p className="form-info">Prosjektet er låst — redigering er ikke tillatt.</p>
      </div>
    );
  }

  return (
    <div className="doc-editor">
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

      <EditorContent editor={editor} className="doc-editor-body" />

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
