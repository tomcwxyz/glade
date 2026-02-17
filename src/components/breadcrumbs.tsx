import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-bark-muted mb-8">
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-bark-muted/50" />}
            {isLast || !crumb.href ? (
              <span className="truncate max-w-[200px]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-canopy transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
