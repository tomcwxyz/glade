"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  MessageSquare,
  Calendar,
  Lightbulb,
  FileText,
  ListChecks,
  Loader2,
} from "lucide-react";
import { globalSearch } from "@/lib/search-actions";
import type { SearchResult } from "@/lib/queries";

/** Custom event the sidebar/mobile triggers dispatch to open the palette. */
export const OPEN_SEARCH_EVENT = "glade:open-search";

const TYPE_ICON: Record<SearchResult["type"], typeof BookOpen> = {
  decision: BookOpen,
  proposal: MessageSquare,
  meeting: Calendar,
  topic: Lightbulb,
  document: FileText,
  action: ListChecks,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  // Open via ⌘K / Ctrl+K and via the custom event (sidebar button).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    };
  }, []);

  // Focus the input when opened.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const res = await globalSearch(q);
      setResults(res);
      setActiveIndex(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-bark/30 backdrop-blur-sm"
      onMouseDown={close}
    >
      <div
        role="dialog"
        aria-label="Search"
        className="w-full max-w-lg bg-paper rounded-xl border border-border shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search size={16} className="text-bark-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search decisions, meetings, proposals…"
            className="flex-1 py-3.5 text-sm bg-transparent focus:outline-none placeholder:text-bark-muted/60"
          />
          {loading && <Loader2 size={15} className="animate-spin text-bark-muted shrink-0" />}
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {query.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-xs text-bark-muted">
              Type at least 2 characters to search.
            </p>
          ) : !loading && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-bark-muted">No matches.</p>
          ) : (
            results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(r.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-canopy-pale" : "hover:bg-paper-warm"
                  }`}
                >
                  <Icon size={15} className="text-bark-muted shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-bark truncate">{r.title}</span>
                    <span className="block text-xs text-bark-muted">{r.subtitle}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
