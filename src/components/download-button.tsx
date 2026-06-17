"use client";

import { Download } from "lucide-react";

/**
 * Triggers a client-side download of `content` as a file. Zero-dependency —
 * builds a Blob and clicks a temporary anchor. Defaults to markdown.
 */
export function DownloadButton({
  content,
  filename,
  label,
  mimeType = "text/markdown;charset=utf-8",
  className,
}: {
  content: string;
  filename: string;
  label?: string;
  mimeType?: string;
  className?: string;
}) {
  function handleDownload() {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      title={label ?? "Download"}
      aria-label={label ?? "Download"}
      className={
        className ??
        "flex items-center gap-1 text-bark-muted hover:text-canopy transition-colors"
      }
    >
      <Download size={14} />
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
}
