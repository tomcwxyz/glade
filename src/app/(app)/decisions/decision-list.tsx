"use client";

import { useState, useMemo } from "react";
import { formatDate, formatDateMonth } from "@/lib/utils";
import { ChevronDown, ChevronUp, ListChecks, Search, X } from "lucide-react";
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

const METHODS = ["all", "consent", "majority_vote", "advice_process", "delegation", "consensus", "lazy_consensus"] as const;

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

interface DecisionListProps {
  decisions: SerializedDecision[];
  tags: string[];
  participants: string[];
}

export function DecisionList({ decisions, tags, participants }: DecisionListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Count active advanced filters
  const advancedFilterCount = [
    methodFilter !== "all",
    tagFilters.length > 0,
    participantFilter !== "all",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setMethodFilter("all");
    setTagFilters([]);
    setParticipantFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = useMemo(() => {
    let result = decisions;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== "all") {
      result = result.filter((d) => d.method === methodFilter);
    }

    // Tag filters (intersection — must have ALL selected tags)
    if (tagFilters.length > 0) {
      result = result.filter((d) =>
        tagFilters.every((tag) => d.tags.includes(tag))
      );
    }

    // Participant filter
    if (participantFilter !== "all") {
      result = result.filter((d) =>
        d.participants.includes(participantFilter)
      );
    }

    // Date range
    if (dateFrom) {
      result = result.filter((d) => d.date >= dateFrom);
    }
    if (dateTo) {
      // Include the full day by comparing with end of day
      result = result.filter((d) => d.date <= dateTo + "T23:59:59.999Z");
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
  }, [decisions, search, statusFilter, methodFilter, tagFilters, participantFilter, dateFrom, dateTo]);

  // Group filtered decisions by month
  const grouped: Record<string, SerializedDecision[]> = {};
  for (const d of filtered) {
    const month = formatDateMonth(d.date);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(d);
  }

  const hasAnyFilter = search || statusFilter !== "all" || advancedFilterCount > 0;

  return (
    <>
      {/* Search and filters */}
      <div className="mb-10 pb-6 border-b border-border">
        {/* Search row */}
        <div className="relative mb-3 sm:mb-0 sm:max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted"
          />
          <input
            type="text"
            placeholder="Search decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/60 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>

        {/* Status tabs + more filters — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 mt-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-2 sm:py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === filter
                    ? "bg-canopy-pale text-canopy font-medium"
                    : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                }`}
              >
                {filter === "all" ? "All" : STATUS_LABELS[filter]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              showMoreFilters || advancedFilterCount > 0
                ? "bg-canopy-pale text-canopy font-medium"
                : "text-bark-muted hover:text-bark hover:bg-paper-deep"
            }`}
          >
            More filters
            {advancedFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-canopy text-paper text-[0.625rem] font-bold">
                {advancedFilterCount}
              </span>
            )}
            {showMoreFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Advanced filters row */}
        {showMoreFilters && (
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-end gap-4 sm:gap-5">
            {/* Method pills */}
            <div className="w-full sm:w-auto">
              <label className="block text-[0.6875rem] uppercase tracking-wider text-bark-muted font-medium mb-1.5">
                Method
              </label>
              <div className="flex flex-wrap gap-1.5">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-2.5 py-1.5 sm:py-1 text-xs rounded-lg transition-colors ${
                      methodFilter === m
                        ? "bg-canopy-pale text-canopy font-medium"
                        : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                    }`}
                  >
                    {m === "all" ? "All" : METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag toggle chips */}
            {tags.length > 0 && (
              <div className="w-full sm:w-auto">
                <label className="block text-[0.6875rem] uppercase tracking-wider text-bark-muted font-medium mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = tagFilters.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() =>
                          setTagFilters((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-2.5 py-1.5 sm:py-1 text-xs rounded-lg transition-colors ${
                          active
                            ? "bg-canopy-pale text-canopy font-medium"
                            : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Participant select */}
            {participants.length > 0 && (
              <div>
                <label className="block text-[0.6875rem] uppercase tracking-wider text-bark-muted font-medium mb-1.5">
                  Participant
                </label>
                <select
                  value={participantFilter}
                  onChange={(e) => setParticipantFilter(e.target.value)}
                  className="px-3 py-2 sm:py-1.5 text-xs bg-paper-warm border border-border rounded-lg text-bark focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20"
                >
                  <option value="all">All participants</option>
                  {participants.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date range */}
            <div>
              <label className="block text-[0.6875rem] uppercase tracking-wider text-bark-muted font-medium mb-1.5">
                Date range
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-2 sm:py-1.5 text-xs bg-paper-warm border border-border rounded-lg text-bark focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20"
                />
                <span className="text-xs text-bark-muted hidden sm:inline">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-2 sm:py-1.5 text-xs bg-paper-warm border border-border rounded-lg text-bark focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20"
                />
              </div>
            </div>

            {/* Clear all */}
            {advancedFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-bark-muted hover:text-earth transition-colors pb-0.5"
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {hasAnyFilter && (
        <p className="text-sm text-bark-muted mb-6">
          {filtered.length} decision{filtered.length !== 1 ? "s" : ""} found
          {search && ` matching "${search}"`}
          {statusFilter !== "all" && ` with status ${STATUS_LABELS[statusFilter]}`}
        </p>
      )}

      {/* Timeline */}
      <div className="relative">
        {filtered.length > 0 && (
          <div className="absolute left-[15px] sm:left-[27px] top-4 bottom-4 w-px bg-border" />
        )}

        {filtered.length === 0 && (
          <p className="text-bark-muted text-center py-12">
            No decisions match your filters.
          </p>
        )}

        {Object.entries(grouped).map(([month, monthDecisions]) => (
          <section key={month} className="mb-12 last:mb-0">
            {/* Month label */}
            <div className="relative flex items-center gap-3 sm:gap-4 mb-6">
              <div className="relative z-10 w-[31px] sm:w-[55px] flex justify-center">
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
                  className="group relative flex gap-3 sm:gap-4 py-4 hover:bg-paper-warm -mx-3 px-3 rounded-xl transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 w-[31px] sm:w-[55px] flex justify-center shrink-0 pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-border-strong group-hover:bg-canopy transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-1.5">
                        <span className="text-xs text-bark-muted font-medium tabular-nums">
                          #{decision.number}
                        </span>
                        <StatusPill status={decision.status} />
                        <MethodTag method={decision.method} />
                        <span className="text-xs text-bark-muted ml-auto">
                          {formatDate(decision.date)}
                        </span>
                      </div>
                      <h3 className="text-[0.9375rem] font-medium text-bark leading-snug group-hover:text-canopy transition-colors">
                        {decision.title}
                      </h3>
                      <p className="text-sm text-bark-muted mt-1.5 line-clamp-2 leading-relaxed">
                        {decision.outcome}
                      </p>
                    </div>

                    {/* Participants & metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
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
                      {decision.actionsCount > 0 && (
                        <>
                          <span className="text-border-strong mx-1">·</span>
                          <span className="flex items-center gap-1 text-xs text-bark-muted">
                            <ListChecks size={12} />
                            {decision.actionsComplete}/{decision.actionsCount}
                          </span>
                        </>
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
