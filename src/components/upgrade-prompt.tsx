import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function UpgradePrompt({
  feature,
  description,
}: {
  feature: string;
  description: string;
}) {
  return (
    <div className="border border-amber/30 bg-amber/5 rounded-xl p-5">
      <h3
        className="text-sm font-medium text-bark mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {feature}
      </h3>
      <p className="text-[0.8125rem] text-bark-muted leading-relaxed mb-3">
        {description}
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm font-medium text-canopy hover:text-canopy-light transition-colors"
      >
        Upgrade to Canopy
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
