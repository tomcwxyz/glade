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
      await setActionPublic(actionId, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={pub ? "Public — click to hide from the public page" : "Hidden from public — click to show"}
      aria-label={pub ? "Hide action from public page" : "Show action on public page"}
      className="shrink-0 text-bark-muted/70 hover:text-bark transition-colors disabled:opacity-50"
    >
      {pub ? <Eye size={15} /> : <EyeOff size={15} className="text-earth/70" />}
    </button>
  );
}
