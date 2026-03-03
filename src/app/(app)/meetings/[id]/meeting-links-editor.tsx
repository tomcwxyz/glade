"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  CircleDot,
  FileText,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";
import { linkToMeeting, unlinkFromMeeting } from "@/lib/meeting-link-actions";

type LinkedDecision = {
  id: string;
  number: number;
  title: string;
  status: string;
};
type LinkedAction = {
  id: string;
  description: string;
  status: string;
  ownerName: string | null;
};
type LinkedDocument = {
  id: string;
  title: string;
  type: string;
  status: string;
};
type LinkedProposal = {
  id: string;
  title: string;
  status: string;
};

type AllDecision = { id: string; number: number; title: string };
type AllAction = { id: string; description: string };
type AllDocument = { id: string; title: string };
type AllProposal = { id: string; title: string };

const STATUS_COLORS: Record<string, string> = {
  decided: "bg-status-decided",
  implemented: "bg-status-implemented",
  reviewed: "bg-status-reviewed",
  learned: "bg-status-learned",
};

export function MeetingLinksEditor({
  meetingId,
  decisions,
  actions,
  documents,
  proposals,
  allDecisions,
  allActions,
  allDocuments,
  allProposals,
}: {
  meetingId: string;
  decisions: LinkedDecision[];
  actions: LinkedAction[];
  documents: LinkedDocument[];
  proposals: LinkedProposal[];
  allDecisions: AllDecision[];
  allActions: AllAction[];
  allDocuments: AllDocument[];
  allProposals: AllProposal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState<
    "decision" | "action" | "document" | "proposal" | null
  >(null);
  const [target, setTarget] = useState("");

  const selectClass =
    "w-full text-sm border border-border rounded-lg px-3 py-2 bg-paper text-bark focus:outline-none focus:ring-2 focus:ring-canopy/20";

  const availableDecisions = allDecisions.filter(
    (d) => !decisions.some((ld) => ld.id === d.id)
  );
  const availableActions = allActions.filter(
    (a) => !actions.some((la) => la.id === a.id)
  );
  const availableDocuments = allDocuments.filter(
    (d) => !documents.some((ld) => ld.id === d.id)
  );
  const availableProposals = allProposals.filter(
    (p) => !proposals.some((lp) => lp.id === p.id)
  );

  function handleAdd(
    entityType: "decision" | "action" | "document" | "proposal"
  ) {
    if (!target) return;
    startTransition(async () => {
      await linkToMeeting(meetingId, entityType, target);
      setShowForm(null);
      setTarget("");
      router.refresh();
    });
  }

  function handleRemove(
    entityType: "decision" | "action" | "document" | "proposal",
    entityId: string
  ) {
    startTransition(async () => {
      await unlinkFromMeeting(meetingId, entityType, entityId);
      router.refresh();
    });
  }

  function renderForm(
    entityType: "decision" | "action" | "document" | "proposal",
    options: { id: string; label: string }[],
    placeholder: string
  ) {
    if (showForm !== entityType) return null;
    return (
      <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={selectClass}
          aria-label={placeholder}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleAdd(entityType)}
            disabled={!target || isPending}
            className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(null);
              setTarget("");
            }}
            className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Decisions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <CircleDot size={13} />
            Decisions ({decisions.length})
          </h2>
          {availableDecisions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowForm("decision");
                setTarget("");
              }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link decision
            </button>
          )}
        </div>
        {renderForm(
          "decision",
          availableDecisions.map((d) => ({
            id: d.id,
            label: `#${d.number} ${d.title}`,
          })),
          "Select a decision..."
        )}
        {decisions.length === 0 && showForm !== "decision" && (
          <p className="text-sm text-bark-muted/60">No linked decisions.</p>
        )}
        <div className="space-y-1">
          {decisions.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href={`/decisions/${d.number}`}
                className="flex-1 flex items-center gap-2 text-sm text-bark hover:text-canopy transition-colors min-w-0"
              >
                <span className="text-xs text-bark-muted font-medium tabular-nums shrink-0">
                  #{d.number}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[d.status] || "bg-bark-muted"}`}
                />
                <span className="truncate">{d.title}</span>
              </Link>
              <button
                type="button"
                onClick={() => handleRemove("decision", d.id)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
                aria-label={`Unlink decision ${d.title}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <CheckSquare size={13} />
            Actions ({actions.length})
          </h2>
          {availableActions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowForm("action");
                setTarget("");
              }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link action
            </button>
          )}
        </div>
        {renderForm(
          "action",
          availableActions.map((a) => ({ id: a.id, label: a.description })),
          "Select an action..."
        )}
        {actions.length === 0 && showForm !== "action" && (
          <p className="text-sm text-bark-muted/60">No linked actions.</p>
        )}
        <div className="space-y-1">
          {actions.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href="/actions"
                className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate"
              >
                {a.description}
              </Link>
              {a.ownerName && (
                <span className="text-xs text-bark-muted shrink-0">
                  {a.ownerName}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove("action", a.id)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
                aria-label={`Unlink action ${a.description}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <FileText size={13} />
            Documents ({documents.length})
          </h2>
          {availableDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowForm("document");
                setTarget("");
              }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link document
            </button>
          )}
        </div>
        {renderForm(
          "document",
          availableDocuments.map((d) => ({ id: d.id, label: d.title })),
          "Select a document..."
        )}
        {documents.length === 0 && showForm !== "document" && (
          <p className="text-sm text-bark-muted/60">No linked documents.</p>
        )}
        <div className="space-y-1">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href={`/documents/${d.id}`}
                className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate"
              >
                {d.title}
              </Link>
              <button
                type="button"
                onClick={() => handleRemove("document", d.id)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
                aria-label={`Unlink document ${d.title}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Proposals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <Lightbulb size={13} />
            Proposals ({proposals.length})
          </h2>
          {availableProposals.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowForm("proposal");
                setTarget("");
              }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link proposal
            </button>
          )}
        </div>
        {renderForm(
          "proposal",
          availableProposals.map((p) => ({ id: p.id, label: p.title })),
          "Select a proposal..."
        )}
        {proposals.length === 0 && showForm !== "proposal" && (
          <p className="text-sm text-bark-muted/60">No linked proposals.</p>
        )}
        <div className="space-y-1">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href={`/proposals/${p.id}`}
                className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate"
              >
                {p.title}
              </Link>
              <button
                type="button"
                onClick={() => handleRemove("proposal", p.id)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
                aria-label={`Unlink proposal ${p.title}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
