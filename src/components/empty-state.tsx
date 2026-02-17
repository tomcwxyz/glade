import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-canopy-pale mb-5">
        <Icon size={28} className="text-canopy" />
      </div>
      <h2
        className="text-xl font-medium tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      <p className="text-[0.8125rem] text-bark-muted max-w-xs leading-relaxed">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          <Plus size={16} />
          {action.label}
        </Link>
      )}
    </div>
  );
}
