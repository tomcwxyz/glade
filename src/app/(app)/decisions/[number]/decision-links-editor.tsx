"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, X, Calendar } from "lucide-react";
import Link from "next/link";
import {
  addDecisionLink,
  removeDecisionLink,
  linkDecisionToMeeting,
  unlinkDecisionFromMeeting,
} from "@/lib/decision-actions";
import { formatDate } from "@/lib/utils";

interface LinkedDecision {
  linkId: string;
  id: string;
  number: number;
  title: string;
  relation: string;
  direction: string;
}

interface LinkedMeeting {
  meetingId: string;
  title: string;
  date: string;
}

interface DecisionOption {
  id: string;
  number: number;
  title: string;
}

interface MeetingOption {
  id: string;
  title: string;
  date: string;
}

const LINK_TYPES = [
  { value: "relates_to", label: "Relates to" },
  { value: "supersedes", label: "Supersedes" },
  { value: "amends", label: "Amends" },
] as const;

const LINK_LABELS: Record<string, string> = {
  relates_to: "relates to",
  supersedes: "supersedes",
  amends: "amends",
};


export function DecisionLinksEditor({
  decisionId,
  links,
  meetings: linkedMeetings,
  allDecisions,
  allMeetings,
}: {
  decisionId: string;
  links: LinkedDecision[];
  meetings: LinkedMeeting[];
  allDecisions: DecisionOption[];
  allMeetings: MeetingOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Link form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTarget, setLinkTarget] = useState("");
  const [linkType, setLinkType] = useState<"relates_to" | "supersedes" | "amends">("relates_to");

  // Meeting form state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTarget, setMeetingTarget] = useState("");

  // Filter out already-linked decisions and self
  const availableDecisions = allDecisions.filter(
    (d) =>
      d.id !== decisionId &&
      !links.some((l) => l.id === d.id)
  );

  // Filter out already-linked meetings
  const availableMeetings = allMeetings.filter(
    (m) => !linkedMeetings.some((lm) => lm.meetingId === m.id)
  );

  function handleAddLink() {
    if (!linkTarget) return;
    startTransition(async () => {
      await addDecisionLink(decisionId, linkTarget, linkType);
      setShowLinkForm(false);
      setLinkTarget("");
      setLinkType("relates_to");
      router.refresh();
    });
  }

  function handleRemoveLink(linkId: string) {
    startTransition(async () => {
      await removeDecisionLink(linkId);
      router.refresh();
    });
  }

  function handleAddMeeting() {
    if (!meetingTarget) return;
    startTransition(async () => {
      await linkDecisionToMeeting(decisionId, meetingTarget);
      setShowMeetingForm(false);
      setMeetingTarget("");
      router.refresh();
    });
  }

  function handleRemoveMeeting(meetingId: string) {
    startTransition(async () => {
      await unlinkDecisionFromMeeting(decisionId, meetingId);
      router.refresh();
    });
  }

  const selectClass =
    "w-full px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

  return (
    <div className={`space-y-8 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Decision links */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <Link2 size={14} />
            Linked decisions
          </h2>
          {availableDecisions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Add link
            </button>
          )}
        </div>

        {/* Add link form */}
        {showLinkForm && (
          <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as typeof linkType)}
              className={selectClass}
            >
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a decision...</option>
              {availableDecisions.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.number} {d.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddLink}
                disabled={!linkTarget}
                className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing links */}
        {links.length === 0 && !showLinkForm && (
          <p className="text-sm text-bark-muted/60">No linked decisions.</p>
        )}

        <div className="space-y-1">
          {links.map((linked) => (
            <div
              key={linked.linkId}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href={`/decisions/${linked.number}`}
                className="flex-1 flex items-center gap-2 text-sm text-bark hover:text-canopy transition-colors min-w-0"
              >
                <span className="text-xs text-bark-muted font-medium tabular-nums shrink-0">
                  #{linked.number}
                </span>
                <span className="truncate">{linked.title}</span>
              </Link>
              <span className="text-[0.6875rem] text-bark-muted/60 italic shrink-0">
                {LINK_LABELS[linked.relation] || linked.relation}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveLink(linked.linkId)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Meeting links */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <Calendar size={14} />
            Meeting
          </h2>
          {availableMeetings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMeetingForm(!showMeetingForm)}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link meeting
            </button>
          )}
        </div>

        {/* Add meeting form */}
        {showMeetingForm && (
          <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
            <select
              value={meetingTarget}
              onChange={(e) => setMeetingTarget(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a meeting...</option>
              {availableMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({formatDate(m.date)})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddMeeting}
                disabled={!meetingTarget}
                className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
              >
                Link
              </button>
              <button
                type="button"
                onClick={() => setShowMeetingForm(false)}
                className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing meeting links */}
        {linkedMeetings.length === 0 && !showMeetingForm && (
          <p className="text-sm text-bark-muted/60">Not linked to a meeting.</p>
        )}

        <div className="space-y-1">
          {linkedMeetings.map((m) => (
            <div
              key={m.meetingId}
              className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
            >
              <Link
                href={`/meetings/${m.meetingId}`}
                className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate"
              >
                {m.title}
              </Link>
              <span className="text-xs text-bark-muted shrink-0">
                {formatDate(m.date)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveMeeting(m.meetingId)}
                className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
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
