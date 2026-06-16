'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

type Props = {
  label: string;
  content: string;
  onClose: () => void;
};

export function DocumentReadOnly({ label, content, onClose }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
    ],
    content: content || '<p></p>',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-64 p-4',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content || '<p></p>');
  }, [editor, content]);

  return (
    <div className="doc-editor doc-editor--readonly">
      <div className="doc-editor-header">
        <p className="doc-editor-title">{label}</p>
        <span className="doc-readonly-badge">Kun visning</span>
      </div>
      <EditorContent editor={editor} className="doc-editor-body" />
      <button type="button" className="btn-cancel doc-editor-close" onClick={onClose}>
        Lukk
      </button>
    </div>
  );
}
