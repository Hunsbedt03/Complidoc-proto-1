'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import type { ProjectStatus } from '@/lib/projectStatus';

type Props = {
  documentLabel: string;
  initialContent: string;
  projectStatus: ProjectStatus;
  onSave: (content: string, contentJson: string, changeNote: string) => void;
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
  const locked = projectStatus === 'locked';

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || `<p></p>`,
    editable: mode === 'edit' && !locked,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === 'edit' && !locked);
  }, [editor, mode, locked]);

  useEffect(() => {
    if (!editor || mode !== 'view') return;
    editor.commands.setContent(initialContent || '<p></p>');
  }, [editor, initialContent, mode]);

  function handleSaveRevision() {
    if (!editor || !changeNote.trim()) return;
    onSave(editor.getHTML(), JSON.stringify(editor.getJSON()), changeNote.trim());
    setSaveOpen(false);
    setChangeNote('');
    setMode('view');
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
      <div className="doc-editor-toolbar">
        {mode === 'view' ? (
          <button type="button" className="btn-dl" onClick={() => setMode('edit')}>
            Rediger
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-dl"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              Fet
            </button>
            <button
              type="button"
              className="btn-dl"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              Kursiv
            </button>
            <button
              type="button"
              className="btn-dl"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </button>
            <button
              type="button"
              className="btn-dl"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              Liste
            </button>
            <button
              type="button"
              className="btn-generate"
              style={{ marginLeft: 'auto' }}
              onClick={() => setSaveOpen(true)}
            >
              Lagre revisjon
            </button>
            <button type="button" className="btn-cancel" onClick={() => setMode('view')}>
              Avbryt
            </button>
          </>
        )}
        {onRegenerate && mode === 'view' ? (
          <button
            type="button"
            className="btn-cancel"
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
      </div>

      <p className="doc-editor-title">{documentLabel}</p>
      <EditorContent editor={editor} className="doc-editor-body" />

      {saveOpen ? (
        <div className="lock-dialog-backdrop" role="presentation">
          <div className="lock-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Lagre ny revisjon</h3>
            <p>Beskriv endringen (vises i revisjonsloggen):</p>
            <input
              className="form-input"
              maxLength={100}
              required
              placeholder="f.eks. Oppdatert fareidentifikasjon"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
            <div className="lock-dialog-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSaveOpen(false)}
              >
                Avbryt
              </button>
              <button
                type="button"
                className="btn-generate"
                disabled={!changeNote.trim()}
                onClick={handleSaveRevision}
              >
                Lagre ny revisjon
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'edit' ? null : (
        <button type="button" className="btn-cancel" style={{ marginTop: 8 }} onClick={onCancel}>
          Lukk
        </button>
      )}
    </div>
  );
}
