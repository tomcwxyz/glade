"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { setActionPublic } from "@/lib/action-actions";

export function ActionVisibilityToggle({
  actionId,
  isPublic,
}: {
  actionId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pub, setPub] = useState(isPublic);

  function toggle() {
    const next = !pub;
    setPub(next);
    start(async () => {
      const result = await setActionPublic(actionId, next);
      if (result && "error" in result) {
        setPub(pub);
        return;
      }
      router.refresh();
    });
  }

  const label = pub ? "Public" : "Hidden";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={pub ? "Visible on the public actions page — click to hide" : "Hidden from the public actions page — click to show"}
      aria-label={pub ? "Hide action from public page" : "Show action on public page"}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper-warm px-2.5 text-xs font-medium text-bark-muted hover:border-canopy/30 hover:text-bark transition-colors disabled:opacity-50"
    >
      {pub ? <Eye size={14} /> : <EyeOff size={14} className="text-earth/70" />}
      <span>{label}</span>
    </button>
  );
}
