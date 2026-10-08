'use client';

import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Bold, Heading3, Italic, List, ListOrdered, Minus, Redo2, SeparatorHorizontal, Table2, Underline as UnderlineIcon, Undo2, Variable } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DocNode } from '@/lib/contracts/types';
import { VARIABLES } from '@/lib/contracts/variables';

/** A hard page break. Rendered as a labelled dashed rule in the editor, as a new page in the PDF. */
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-page-break]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': '' }), ['span', {}, 'Page break']],
});

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // keep the selection inside the editor when a toolbar button is pressed
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('inline-flex size-9 items-center justify-center rounded-md text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 lg:size-8', active && 'bg-slate-200 text-slate-900')}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const inTable = editor.isActive('table');
  const groups = useMemo(() => {
    const m = new Map<string, typeof VARIABLES>();
    for (const v of VARIABLES) m.set(v.group, [...(m.get(v.group) ?? []), v]);
    return Array.from(m.entries());
  }, []);
  const c = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-white/95 p-1.5 backdrop-blur">
      <Btn label="Undo" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 className="size-4" /></Btn>
      <Btn label="Redo" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Btn label="Bold" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn label="Italic" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <Btn label="Underline" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Btn label="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Btn>
      <Btn label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <Btn label="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="size-4" /></Btn>
      <Btn label="Horizontal line" onClick={() => c().setHorizontalRule().run()}><Minus className="size-4" /></Btn>
      <Btn label="Page break" onClick={() => c().insertContent({ type: 'pageBreak' }).run()}><SeparatorHorizontal className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <Variable className="size-4" aria-hidden="true" />
        <span className="sr-only">Insert merge field</span>
        <Select
          aria-label="Insert merge field"
          className="h-9 w-44 py-0 text-sm lg:h-8"
          value=""
          onChange={(e) => { if (e.target.value) { c().insertContent(`{{${e.target.value}}}`).run(); e.target.value = ''; } }}
        >
          <option value="">Insert merge field…</option>
          {groups.map(([g, vs]) => <optgroup key={g} label={g}>{vs.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</optgroup>)}
        </Select>
      </label>
      {inTable && (
        <div className="flex w-full flex-wrap items-center gap-1 border-t pt-1.5 text-xs" role="group" aria-label="Table tools">
          <span className="px-1 font-medium text-slate-500">Table</span>
          {([['Row above', () => c().addRowBefore().run()], ['Row below', () => c().addRowAfter().run()], ['Column left', () => c().addColumnBefore().run()], ['Column right', () => c().addColumnAfter().run()], ['Delete row', () => c().deleteRow().run()], ['Delete column', () => c().deleteColumn().run()], ['Header row', () => c().toggleHeaderRow().run()], ['Delete table', () => c().deleteTable().run()]] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn} className="rounded-md border bg-white px-2 py-1 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring">{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Rich-text editor for one contract section (TipTap / ProseMirror). Content is the whitelisted JSON schema in
 * lib/contracts/types.ts; the server re-sanitizes everything it receives. Give it a `key` per section.
 */
export function RichEditor({ value, onChange, label, readOnly = false, className }: { value: DocNode; onChange: (doc: DocNode) => void; label: string; readOnly?: boolean; className?: string }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, strike: false, code: false, codeBlock: false, blockquote: false }),
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell, PageBreak,
    ],
    content: value as never,
    editorProps: { attributes: { class: 'contract-prose min-h-[260px] px-4 py-3', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label } },
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getJSON() as DocNode),
  });
  useEffect(() => { editor?.setEditable(!readOnly); }, [editor, readOnly]);
  if (!editor) return <div className={cn('min-h-[320px] animate-pulse rounded-lg border bg-slate-50', className)} aria-busy="true" />;
  return (
    <div className={cn('rounded-lg border bg-white shadow-xs focus-within:ring-2 focus-within:ring-ring/40', className)}>
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
