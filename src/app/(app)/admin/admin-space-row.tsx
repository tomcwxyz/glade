"use client";

import { useTransition } from "react";
import { setSpacePlan } from "@/lib/admin-actions";
import { PLAN_DISPLAY } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";

const PLAN_BADGE_COLORS: Record<PlanTier, string> = {
  free: "bg-paper-deep text-bark-muted",
  pro: "bg-canopy-pale text-canopy",
  enterprise: "bg-amber-pale text-amber-dark",
};

interface AdminSpaceRowProps {
  space: {
    id: string;
    name: string;
    slug: string;
    planTier: PlanTier;
    memberCount: number;
    createdAt: string;
    hasStripe: boolean;
  };
}

export function AdminSpaceRow({ space }: AdminSpaceRowProps) {
  const [isPending, startTransition] = useTransition();

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newTier = e.target.value as PlanTier;
    if (newTier === space.planTier) return;
    startTransition(async () => {
      await setSpacePlan(space.id, newTier);
    });
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-2.5 text-bark font-medium">{space.name}</td>
      <td className="px-4 py-2.5 text-bark-muted font-mono text-xs">{space.slug}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE_COLORS[space.planTier]}`}
          >
            {PLAN_DISPLAY[space.planTier].name}
          </span>
          <select
            value={space.planTier}
            onChange={handlePlanChange}
            disabled={isPending}
            className="text-xs border border-border rounded-md px-1.5 py-1 bg-paper text-bark disabled:opacity-50"
          >
            <option value="free">Seedling</option>
            <option value="pro">Canopy</option>
            <option value="enterprise">Old Growth</option>
          </select>
          {space.hasStripe && (
            <span className="text-[0.6875rem] text-bark-muted" title="Has Stripe subscription">
              Stripe
            </span>
          )}
          {isPending && (
            <span className="text-xs text-bark-muted animate-pulse">Saving…</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-bark-muted text-right">{space.memberCount}</td>
      <td className="px-4 py-2.5 text-bark-muted">
        {new Date(space.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
    </tr>
  );
}
