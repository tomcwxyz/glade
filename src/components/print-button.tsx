"use client";

import { Printer } from "lucide-react";

/** Triggers the browser print dialog (used to save a page as PDF). */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
    >
      <Printer size={16} />
      {label}
    </button>
  );
}
