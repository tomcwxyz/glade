"use client";

import { useState } from "react";
import { publishDocument, unpublishDocument } from "@/lib/document-actions";
import { Globe, FileText, Loader2 } from "lucide-react";

export function DocumentStatusActions({
  documentId,
  currentStatus,
}: {
  documentId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    if (currentStatus === "draft") {
      await publishDocument(documentId);
    } else {
      await unpublishDocument(documentId);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : currentStatus === "draft" ? (
        <>
          <Globe size={14} />
          Publish
        </>
      ) : (
        <>
          <FileText size={14} />
          Unpublish
        </>
      )}
    </button>
  );
}
