/**
 * CaseRichTextEditor
 *
 * A lighter Tiptap editor tuned for case descriptions.
 * - Toolbar: Bold, Italic, Underline, inline Code, Bullet list, Ordered list, Undo/Redo
 * - Paste / drop intercept: images are NOT inserted inline. Instead, they fire
 *   the onImageCapture callback so the parent can route them to the attachments zone.
 */

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit                   from "@tiptap/starter-kit";
import Underline                    from "@tiptap/extension-underline";
import Placeholder                  from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Code,
  List, ListOrdered, Undo, Redo,
} from "lucide-react";

// ── Toolbar helpers ────────────────────────────────────────────────────────────

function TBtn({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void; active?: boolean;
  disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function TDivider() {
  return <div className="w-px h-4 bg-border mx-0.5 self-center" />;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface CaseRichTextEditorProps {
  onChange:        (html: string) => void;
  onImageCapture:  (file: File) => void;
  placeholder?:    string;
  disabled?:       boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CaseRichTextEditor({
  onChange, onImageCapture,
  placeholder = "Describe the issue, steps to reproduce, or any relevant context…",
  disabled = false,
}: CaseRichTextEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We don't need headings or blockquote for a case description
        heading:    false,
        blockquote: false,
        code:       {},
        codeBlock:  false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      // ── Paste: intercept images ──────────────────────────────────────────
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find(i => i.type.startsWith("image/"));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (file) { onImageCapture(file); }
        return true; // prevent default paste behaviour for images
      },
      // ── Drop: intercept image files ──────────────────────────────────────
      handleDrop(_view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const images = files.filter(f => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        images.forEach(f => onImageCapture(f));
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  return (
    <div className={`rounded-lg border border-border bg-background flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 ${disabled ? "opacity-60" : ""}`}>
      {/* Toolbar */}
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
          <TBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo className="w-3.5 h-3.5" />
          </TBtn>

          <TDivider />

          <TBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="w-3.5 h-3.5" />
          </TBtn>

          <TDivider />

          <TBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="w-3.5 h-3.5" />
          </TBtn>
        </div>
      )}

      {/* Editable area */}
      <EditorContent
        editor={editor}
        className="rich-editor flex-1 px-3 py-2.5 text-sm text-foreground focus-within:outline-none overflow-y-auto"
        style={{ minHeight: 120, maxHeight: 260 }}
      />
    </div>
  );
}

// ── Plain-text extractor (for SF Description field) ────────────────────────────

/** Strip all HTML tags and collapse whitespace — safe for plain-text SF fields. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
