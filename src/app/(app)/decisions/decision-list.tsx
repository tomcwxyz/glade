"use client";

import { useState, useMemo } from "react";
import { formatDate, formatDateMonth } from "@/lib/utils";
import { ListChecks, Search } from "lucide-react";
import Link from "next/link";

interface SerializedDecision {
  id: string;
  number: number;
  title: string;
  description: string;
  outcome: string;
  method: string;
  status: string;
  participants: string[];
  date: string;
  tags: string[];
  actionsCount: number;
  actionsComplete: number;
}

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

const STATUS_LABELS: Record<string, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

const FILTERS = ["all", "decided", "implemented", "reviewed", "learned"] as const;

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    decided: "bg-status-decided/10 text-status-decided",
    implemented: "bg-status-implemented/10 text-status-implemented",
    reviewed: "bg-status-reviewed/10 text-status-reviewed",
    learned: "bg-status-learned/10 text-status-learned",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-paper-deep text-bark-muted"}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function MethodTag({ method }: { method: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-bark-muted bg-paper-deep">
      {METHOD_LABELS[method] || method}
    </span>
  );
}

export function DecisionList({ decisions }: { decisions: SerializedDecision[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = decisions;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.outcome.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          `#${d.number}`.includes(q)
      );
    }

    return result;
  }, [decisions, search, statusFilter]);

  // Group filtered decisions by month
  const grouped: Record<string, SerializedDecision[]> = {};
  for (const d of filtered) {
    const month = formatDateMonth(d.date);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(d);
  }

  return (
    <>
      {/* Search and filters */}
      <div className="flex items-center gap-3 mb-10 pb-6 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted"
          />
          <input
            type="text"
            placeholder="Search decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/60 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                statusFilter === filter
                  ? "bg-canopy-pale text-canopy font-medium"
                  : "text-bark-muted hover:text-bark hover:bg-paper-deep"
              }`}
            >
              {filter === "all" ? "All" : STATUS_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(search || statusFilter !== "all") && (
        <p className="text-sm text-bark-muted mb-6">
          {filtered.length} decision{filtered.length !== 1 ? "s" : ""} found
          {search && ` matching "${search}"`}
          {statusFilter !== "all" && ` with status ${STATUS_LABELS[statusFilter]}`}
        </p>
      )}

      {/* Timeline */}
      <div className="relative">
        {filtered.length > 0 && (
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border" />
        )}

        {filtered.length === 0 && (
          <p className="text-bark-muted text-center py-12">
            No decisions match your filters.
          </p>
        )}

        {Object.entries(grouped).map(([month, monthDecisions]) => (
          <section key={month} className="mb-12 last:mb-0">
            {/* Month label */}
            <div className="relative flex items-center gap-4 mb-6">
              <div className="relative z-10 w-[55px] flex justify-center">
                <div className="w-3 h-3 rounded-full bg-paper border-2 border-canopy" />
              </div>
              <h2
                className="text-lg font-medium tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {month}
              </h2>
            </div>

            {/* Decision entries */}
            <div className="space-y-1">
              {monthDecisions.map((decision) => (
                <Link
                  key={decision.id}
                  href={`/decisions/${decision.number}`}
                  className="group relative flex gap-4 py-4 hover:bg-paper-warm -mx-3 px-3 rounded-xl transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 w-[55px] flex justify-center shrink-0 pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-border-strong group-hover:bg-canopy transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-xs text-bark-muted font-medium tabular-nums">
                            #{decision.number}
                          </span>
                          <StatusPill status={decision.status} />
                          <MethodTag method={decision.method} />
                        </div>
                        <h3 className="text-[0.9375rem] font-medium text-bark leading-snug group-hover:text-canopy transition-colors">
                          {decision.title}
                        </h3>
                        <p className="text-sm text-bark-muted mt-1.5 line-clamp-2 leading-relaxed">
                          {decision.outcome}
                        </p>
                      </div>

                      <div className="text-right shrink-0 pt-0.5">
                        <div className="text-xs text-bark-muted">
                          {formatDate(decision.date)}
                        </div>
                        {decision.actionsCount > 0 && (
                          <div className="flex items-center justify-end gap-1 mt-1.5 text-xs text-bark-muted">
                            <ListChecks size={12} />
                            <span>
                              {decision.actionsComplete}/{decision.actionsCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="flex items-center gap-1.5 mt-3">
                      {(decision.participants ?? []).slice(0, 5).map((p, i) => (
                        <div
                          key={p}
                          className="w-6 h-6 rounded-full bg-paper-deep border border-border flex items-center justify-center text-[0.625rem] font-medium text-bark-muted"
                          title={p}
                          style={{ marginLeft: i > 0 ? "-4px" : "0" }}
                        >
                          {p
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                      ))}
                      {(decision.participants?.length ?? 0) > 5 && (
                        <span className="text-xs text-bark-muted ml-1">
                          +{(decision.participants?.length ?? 0) - 5}
                        </span>
                      )}
                      {decision.tags.length > 0 && (
                        <>
                          <span className="text-border-strong mx-1">·</span>
                          {decision.tags.map((tag) => (
                            <span key={tag} className="text-xs text-bark-muted">
                              {tag}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
