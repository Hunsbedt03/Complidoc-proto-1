'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

type Tool =
  | { type: 'button'; label: string; action: () => void; active?: boolean }
  | { type: 'divider' };

type Props = {
  editor: Editor | null;
};

export function EditorToolbar({ editor }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((t) => t + 1);
    editor.on('selectionUpdate', bump);
    editor.on('transaction', bump);
    return () => {
      editor.off('selectionUpdate', bump);
      editor.off('transaction', bump);
    };
  }, [editor]);

  if (!editor) return null;

  const tools: Tool[] = [
    {
      type: 'button',
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      type: 'button',
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
    },
    {
      type: 'button',
      label: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      type: 'button',
      label: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      type: 'button',
      label: 'U',
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive('underline'),
    },
    { type: 'divider' },
    {
      type: 'button',
      label: '•',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      type: 'button',
      label: '1.',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    { type: 'divider' },
    {
      type: 'button',
      label: '↩',
      action: () => editor.chain().focus().undo().run(),
    },
    {
      type: 'button',
      label: '↪',
      action: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatering">
      {tools.map((tool, i) =>
        tool.type === 'divider' ? (
          <span key={`d-${i}`} className="editor-toolbar-divider" aria-hidden />
        ) : (
          <button
            key={tool.label}
            type="button"
            className={
              'editor-toolbar-btn' + (tool.active ? ' editor-toolbar-btn--active' : '')
            }
            onClick={tool.action}
            title={tool.label}
          >
            {tool.label}
          </button>
        )
      )}
    </div>
  );
}
