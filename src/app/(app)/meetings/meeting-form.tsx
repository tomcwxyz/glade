"use client";

import { useState } from "react";
import { createMeeting, updateMeeting } from "@/lib/meeting-actions";
import { inputClass } from "@/lib/utils";
import { Check, Clock, FileText, Globe, Loader2, Plus, X, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/form-error";

interface Member {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  title: string;
  description: string | null;
  type: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
}

interface AgendaItem {
  title: string;
  description: string;
  type: string;
  durationMinutes: string;
  proposalId: string;
  topicId: string;
}

interface MeetingData {
  id: string;
  title: string;
  date: string;
  type: string | null;
  status: string;
  notes: string | null;
  isPublic: boolean;
  attendeeIds: string[];
  agendaItems: AgendaItem[];
}

const MEETING_TYPES = [
  "Board Meeting",
  "Team Meeting",
  "Working Group",
  "AGM",
  "Committee",
  "Other",
];

const MEETING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const TOPIC_TYPE_TO_AGENDA: Record<string, string> = {
  question: "for_discussion",
  tension: "for_discussion",
  agenda_suggestion: "for_discussion",
};


const emptyAgendaItem: AgendaItem = {
  title: "",
  description: "",
  type: "for_discussion",
  durationMinutes: "",
  proposalId: "",
  topicId: "",
};

export function MeetingForm({
  members,
  meeting,
  topics,
  proposals,
}: {
  members: Member[];
  meeting?: MeetingData;
  topics?: Topic[];
  proposals?: Proposal[];
}) {
  const isEditing = !!meeting;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(
    meeting?.attendeeIds || []
  );
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(
    meeting?.agendaItems || []
  );
  const [addedTopicIds, setAddedTopicIds] = useState<Set<string>>(new Set());
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [showProposalPicker, setShowProposalPicker] = useState(false);

  const availableTopics = (topics || []).filter((t) => !addedTopicIds.has(t.id));
  const availableProposals = (proposals || []).filter(
    (p) => p.status === "open_for_discussion" || p.status === "ready_for_decision"
  );

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function addTopicAsAgendaItem(topic: Topic) {
    setAgendaItems((prev) => [
      ...prev,
      {
        ...emptyAgendaItem,
        title: topic.title,
        description: topic.description || "",
        type: TOPIC_TYPE_TO_AGENDA[topic.type] || "for_discussion",
        topicId: topic.id,
      },
    ]);
    setAddedTopicIds((prev) => new Set([...prev, topic.id]));
  }

  function addProposalAsAgendaItem(proposal: Proposal) {
    setAgendaItems((prev) => [
      ...prev,
      {
        ...emptyAgendaItem,
        title: proposal.title,
        type: "for_decision",
        proposalId: proposal.id,
      },
    ]);
  }

  function updateAgenda(index: number, field: keyof AgendaItem, value: string) {
    const updated = [...agendaItems];
    updated[index] = { ...updated[index], [field]: value };
    setAgendaItems(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("attendeeIds", selectedAttendees.join(","));

    // Add agenda items
    formData.delete("agendaTitle");
    formData.delete("agendaDescription");
    formData.delete("agendaType");
    formData.delete("agendaDuration");
    formData.delete("agendaProposalId");
    formData.delete("agendaTopicId");
    for (const item of agendaItems) {
      if (item.title.trim()) {
        formData.append("agendaTitle", item.title);
        formData.append("agendaDescription", item.description);
        formData.append("agendaType", item.type);
        formData.append("agendaDuration", item.durationMinutes);
        formData.append("agendaProposalId", item.proposalId);
        formData.append("agendaTopicId", item.topicId);
      }
    }

    const result = isEditing
      ? await updateMeeting(meeting!.id, formData)
      : await createMeeting(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  function toDateInputValue(isoString: string | null | undefined): string {
    if (!isoString) return "";
    return isoString.split("T")[0];
  }

  // Total estimated time
  const totalMinutes = agendaItems.reduce(
    (sum, item) => sum + (parseInt(item.durationMinutes, 10) || 0),
    0
  );

  return (
    <>
      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-bark mb-1.5">
            Meeting title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            aria-required="true"
            defaultValue={meeting?.title || ""}
            placeholder="e.g. Board Meeting — February 2026"
            className={inputClass}
          />
        </div>

        {/* Date, Type & Status */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-bark mb-1.5">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              aria-required="true"
              defaultValue={
                toDateInputValue(meeting?.date) ||
                new Date().toISOString().split("T")[0]
              }
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-bark mb-1.5">
              Type <span className="font-normal text-bark-muted">(optional)</span>
            </label>
            <select
              id="type"
              name="type"
              defaultValue={meeting?.type || ""}
              className={inputClass}
            >
              <option value="">Select type...</option>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-bark mb-1.5">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={meeting?.status || "draft"}
              className={inputClass}
            >
              {MEETING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-bark mb-1.5">
            Notes <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={meeting?.notes || ""}
            placeholder="Meeting notes, agenda, key discussion points..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Attendees */}
        <div>
          <label className="block text-sm font-medium text-bark mb-3">
            Attendees
          </label>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => {
              const selected = selectedAttendees.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                    selected
                      ? "border-canopy/30 bg-canopy-pale text-canopy font-medium"
                      : "border-border bg-paper-warm text-bark-muted hover:text-bark hover:border-canopy/20"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      selected
                        ? "bg-canopy border-canopy text-paper"
                        : "border-border bg-paper"
                    }`}
                  >
                    {selected && <Check size={12} />}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-paper-deep border border-border flex items-center justify-center text-[0.625rem] font-medium text-bark-muted shrink-0">
                      {m.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span className="truncate">{m.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-bark">
                Agenda <span className="font-normal text-bark-muted">(optional)</span>
              </label>
              {totalMinutes > 0 && (
                <span className="flex items-center gap-1 text-xs text-bark-muted">
                  <Clock size={12} />
                  {totalMinutes} min total
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {availableProposals.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProposalPicker(!showProposalPicker);
                      setShowTopicPicker(false);
                    }}
                    className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
                  >
                    <FileText size={14} />
                    Add proposal
                  </button>
                  {showProposalPicker && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
                      {availableProposals.map((proposal) => (
                        <button
                          key={proposal.id}
                          type="button"
                          onClick={() => {
                            addProposalAsAgendaItem(proposal);
                            setShowProposalPicker(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors"
                        >
                          <span className="text-sm text-bark block truncate">
                            {proposal.title}
                          </span>
                          <span className="text-xs text-bark-muted">
                            {proposal.status === "ready_for_decision"
                              ? "Ready for decision"
                              : "Open for discussion"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {availableTopics.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTopicPicker(!showTopicPicker);
                      setShowProposalPicker(false);
                    }}
                    className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
                  >
                    <MessageSquarePlus size={14} />
                    Add from topics
                  </button>
                  {showTopicPicker && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
                      {availableTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => {
                            addTopicAsAgendaItem(topic);
                            if (availableTopics.length <= 1) setShowTopicPicker(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors"
                        >
                          <span className="text-sm text-bark block truncate">
                            {topic.title}
                          </span>
                          {topic.description && (
                            <span className="text-xs text-bark-muted block truncate">
                              {topic.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setAgendaItems([...agendaItems, { ...emptyAgendaItem }])
                }
                className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
              >
                <Plus size={14} />
                Add item
              </button>
            </div>
          </div>

          {agendaItems.length === 0 && (
            <p className="text-sm text-bark-muted/60 py-3">
              No agenda items. Add items to structure the meeting.
            </p>
          )}

          <div className="space-y-3">
            {agendaItems.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 bg-paper-warm rounded-lg border border-border"
              >
                <span className="text-sm text-bark-muted font-medium tabular-nums pt-2.5 w-5 shrink-0">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateAgenda(i, "title", e.target.value)}
                    placeholder="Agenda item title"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateAgenda(i, "description", e.target.value)}
                      placeholder="Brief description (optional)"
                      className={inputClass}
                    />
                    <select
                      value={item.type}
                      onChange={(e) => updateAgenda(i, "type", e.target.value)}
                      className={`${inputClass} w-auto`}
                    >
                      <option value="for_discussion">For discussion</option>
                      <option value="for_decision">For decision</option>
                      <option value="for_information">For information</option>
                    </select>
                    <input
                      type="number"
                      value={item.durationMinutes}
                      onChange={(e) => updateAgenda(i, "durationMinutes", e.target.value)}
                      placeholder="min"
                      min="1"
                      className={`${inputClass} w-20 text-center`}
                      title="Estimated minutes"
                    />
                  </div>
                  {item.proposalId && (
                    <span className="inline-flex items-center gap-1 text-xs text-canopy">
                      <FileText size={11} />
                      Linked to proposal
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAgendaItems(agendaItems.filter((_, idx) => idx !== i))
                  }
                  className="text-bark-muted hover:text-earth transition-colors mt-2"
                  aria-label="Remove agenda item"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Public visibility */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={meeting?.isPublic ?? false}
              className="w-4 h-4 rounded border-border text-canopy focus:ring-canopy"
            />
            <Globe size={14} className="text-bark-muted" />
            <span className="text-sm text-bark">Make this meeting publicly visible</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Create meeting"
            )}
          </button>
          <Link
            href="/meetings"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
