"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createDocument, updateDocument, autoSaveDocument } from "@/lib/document-actions";
import { TiptapEditor } from "@/components/tiptap-editor";
import { ArrowLeft, Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";

const TYPES = [
  { value: "constitution", label: "Constitution" },
  { value: "terms_of_reference", label: "Terms of Reference" },
  { value: "policy", label: "Policy" },
  { value: "role_description", label: "Role Description" },
  { value: "standing_orders", label: "Standing Orders" },
  { value: "custom", label: "Other" },
] as const;

interface DocumentData {
  id: string;
  title: string;
  type: string;
  content: JSONContent | null;
}

const inputClass =
  "w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-bark-muted">
      {status === "saving" && (
        <>
          <Cloud size={13} className="animate-pulse" />
          Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check size={13} className="text-canopy" />
          <span className="text-canopy">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff size={13} className="text-earth" />
          <span className="text-earth">Save failed</span>
        </>
      )}
    </span>
  );
}

export function DocumentForm({ document }: { document?: DocumentData }) {
  const isEditing = !!document;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<JSONContent | null>(
    document?.content || null
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doAutoSave = useCallback(
    async (newContent: JSONContent) => {
      if (!document?.id) return;
      setSaveStatus("saving");
      const result = await autoSaveDocument(document.id, newContent);
      setSaveStatus(result?.error ? "error" : "saved");
    },
    [document?.id]
  );

  function handleContentChange(newContent: JSONContent) {
    setContent(newContent);
    if (!isEditing) return;
    // Debounced auto-save
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doAutoSave(newContent), 1500);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Cancel any pending auto-save
    if (timerRef.current) clearTimeout(timerRef.current);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("content", content ? JSON.stringify(content) : "");

    const result = isEditing
      ? await updateDocument(document!.id, formData)
      : await createDocument(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <Link
        href={isEditing ? `/documents/${document?.id}` : "/documents"}
        className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        {isEditing ? "Back to document" : "Documents"}
      </Link>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-bark mb-1.5">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={document?.title || ""}
            placeholder="Document title"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-bark mb-1.5">
              Type
            </label>
            <select
              id="type"
              name="type"
              required
              defaultValue={document?.type || "policy"}
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEditing && (
          <div>
            <label htmlFor="changeDescription" className="block text-sm font-medium text-bark mb-1.5">
              What changed? <span className="font-normal text-bark-muted">(optional)</span>
            </label>
            <input
              id="changeDescription"
              name="changeDescription"
              type="text"
              placeholder="Brief description of this edit"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-bark">
              Content
            </label>
            {isEditing && <SaveStatusIndicator status={saveStatus} />}
          </div>
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing your document…"
          />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Create document"
            )}
          </button>
          <Link
            href="/documents"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
