import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Default page size for server-rendered list pages. */
export const PAGE_SIZE = 50;

/**
 * Simple link-based prev/next pager for server-rendered lists. `basePath` is the
 * page path (e.g. "/actions"); navigation is via the `?page=` query param.
 */
export function Pagination({
  page,
  hasMore,
  basePath,
}: {
  page: number;
  hasMore: boolean;
  basePath: string;
}) {
  if (page <= 1 && !hasMore) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between mt-6 pt-4 border-t border-border text-sm"
    >
      {page > 1 ? (
        <Link
          href={`${basePath}?page=${page - 1}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
        >
          <ChevronLeft size={14} />
          Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="text-bark-muted tabular-nums">Page {page}</span>

      {hasMore ? (
        <Link
          href={`${basePath}?page=${page + 1}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
        >
          Next
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Parse a `?page=` search param into a 1-based page number. */
export function parsePage(value: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(value) ? value[0] : value || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
