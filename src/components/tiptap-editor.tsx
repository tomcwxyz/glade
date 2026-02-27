"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Check,
  X,
} from "lucide-react";
import type { JSONContent } from "@tiptap/react";

interface TiptapEditorProps {
  content?: JSONContent | null;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Start writing…",
}: TiptapEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-canopy underline" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
          "[&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:my-1.5",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:text-[0.9375rem] [&_li]:leading-relaxed",
          "[&_a]:text-canopy [&_a]:underline",
          "[&_.is-editor-empty:first-child::before]:text-bark-muted/50 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0"
        ),
      },
    },
  });

  // Focus the link input when it appears
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  const applyLink = useCallback(() => {
    if (linkUrl.trim() && editor) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [linkUrl, editor]);

  const cancelLink = useCallback(() => {
    setShowLinkInput(false);
    setLinkUrl("");
    editor?.chain().focus().run();
  }, [editor]);

  if (!editor) return null;

  if (!editable) {
    return (
      <div className="tiptap-readonly">
        <EditorContent editor={editor} />
      </div>
    );
  }

  const toggleLinkInput = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setShowLinkInput(!showLinkInput);
    setLinkUrl("");
  };

  return (
    <div className="rounded-lg border border-border bg-paper-warm overflow-hidden focus-within:ring-2 focus-within:ring-canopy focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-paper-deep/50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
          aria-label="Bold"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
          aria-label="Italic"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
          aria-label="Underline"
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
          aria-label="Bullet list"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={toggleLinkInput}
          active={editor.isActive("link") || showLinkInput}
          title="Add link"
          aria-label="Add link"
        >
          <LinkIcon size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          aria-label="Undo"
        >
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          aria-label="Redo"
        >
          <Redo size={15} />
        </ToolbarButton>
      </div>

      {/* Inline link input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-paper-deep/30">
          <label htmlFor="tiptap-link-url" className="sr-only">
            URL
          </label>
          <input
            ref={linkInputRef}
            id="tiptap-link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                cancelLink();
              }
            }}
            placeholder="https://example.com"
            className="flex-1 px-3 py-1.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
          <button
            type="button"
            onClick={applyLink}
            className="p-1.5 rounded text-canopy hover:bg-canopy-pale transition-colors"
            aria-label="Apply link"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={cancelLink}
            className="p-1.5 rounded text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
            aria-label="Cancel link"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-canopy-pale text-canopy"
          : "text-bark-muted hover:text-bark hover:bg-paper-deep",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
