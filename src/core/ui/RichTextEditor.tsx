"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/lib/cn";
import { Modal } from "@/core/ui/Modal";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

// ── Toolbar button ──────────────────────────────────────────────────────────
function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-[11px] transition-colors",
        active
          ? "bg-purple-500/20 text-purple-300"
          : "text-gray-400 hover:bg-gray-800 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-700" />;
}

// ── Main component ───────────────────────────────────────────────────────────
export function RichTextEditor({ value, onChange, placeholder, rows = 6, label }: RichTextEditorProps) {
  const t = useTranslations("editor");
  const commonT = useTranslations("common");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[inherit] px-4 py-3 text-sm text-gray-200 prose prose-invert prose-sm max-w-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when form resets)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    setLinkValue(prev ?? "https://");
    setIsLinkModalOpen(true);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setIsLinkModalOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0b0e14] transition-colors focus-within:border-purple-500">
      {label && (
        <label className="mb-0 block border-b border-gray-800 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-800/80 bg-[#0d1017] px-2 py-1.5">
        {/* Text style */}
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title={t("bold")}>
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title={t("italic")}>
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title={t("underline")}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title={t("strikethrough")}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title={t("heading1")}>
          H1
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title={t("heading2")}>
          H2
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title={t("heading3")}>
          H3
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title={t("bulletList")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title={t("orderedList")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M10 6h11M10 12h11M10 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
        </ToolbarBtn>

        <Divider />

        {/* Code */}
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title={t("inlineCode")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title={t("codeBlock")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9l-3 3 3 3M15 9l3 3-3 3" />
          </svg>
        </ToolbarBtn>

        <Divider />

        {/* Link */}
        <ToolbarBtn active={editor.isActive("link")} onClick={setLink} title={t("link")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarBtn>

        {/* Blockquote */}
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title={t("blockquote")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </ToolbarBtn>

        {/* HR */}
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t("horizontalRule")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12h18" />
          </svg>
        </ToolbarBtn>

        <Divider />

        {/* Undo / Redo */}
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title={t("undo")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 14L4 9l5-5" />
            <path d="M20 20v-7a4 4 0 00-4-4H4" />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title={t("redo")}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 14l5-5-5-5" />
            <path d="M4 20v-7a4 4 0 014-4h12" />
          </svg>
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <div style={{ minHeight: `${rows * 1.75}rem` }}>
        <EditorContent editor={editor} />
      </div>

      {placeholder && !editor.getText() && (
        <div className="pointer-events-none absolute top-16 px-4 text-sm text-gray-600">
          {placeholder}
        </div>
      )}

      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title={t("linkModalTitle")}>
        <div className="space-y-4">
          <Input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            label={t("linkUrl")}
            placeholder="https://"
          />
          <p className="text-xs text-gray-500">{t("linkModalHint")}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>
              {commonT("cancel")}
            </Button>
            <Button variant="ghost" onClick={() => { setLinkValue(""); applyLink(); }}>
              {t("removeLink")}
            </Button>
            <Button onClick={applyLink}>
              {commonT("confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
