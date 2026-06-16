"use client";

import { useState } from "react";
import { createMeeting, updateMeeting } from "@/lib/meeting-actions";
import { inputClass } from "@/lib/utils";
import { Check, Clock, FileText, EyeOff, Loader2, Plus, X, MessageSquarePlus, Gavel, ListChecks } from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/form-error";
import { OwnerSelect } from "@/components/owner-select";

interface Member {
  id: string;
  name: string;
}

interface DecisionOption {
  id: string;
  number: number;
  title: string;
}

const DECISION_METHODS = [
  { value: "consent", label: "Consent" },
  { value: "majority_vote", label: "Majority Vote" },
  { value: "advice_process", label: "Advice Process" },
  { value: "delegation", label: "Delegation" },
  { value: "consensus", label: "Consensus" },
  { value: "lazy_consensus", label: "Lazy Consensus" },
];

interface NewDecisionDraft {
  title: string;
  method: string;
  outcome: string;
}

interface MeetingActionDraft {
  description: string;
  ownerName: string;
  ownerIds: string[];
  dueDate: string;
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
  facilitatorId: string | null;
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
  decisions = [],
  publicEnabled,
}: {
  members: Member[];
  meeting?: MeetingData;
  topics?: Topic[];
  proposals?: Proposal[];
  decisions?: DecisionOption[];
  publicEnabled?: boolean;
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

  // Decision + action capture (add-only; persisted on save).
  const [linkedDecisionIds, setLinkedDecisionIds] = useState<string[]>([]);
  const [showDecisionPicker, setShowDecisionPicker] = useState(false);
  const [newDecisions, setNewDecisions] = useState<NewDecisionDraft[]>([]);
  const [meetingActionDrafts, setMeetingActionDrafts] = useState<MeetingActionDraft[]>([]);

  const availableDecisions = decisions.filter((d) => !linkedDecisionIds.includes(d.id));

  function updateNewDecision(index: number, field: keyof NewDecisionDraft, value: string) {
    setNewDecisions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateMeetingAction(
    index: number,
    field: keyof MeetingActionDraft,
    value: string | string[]
  ) {
    setMeetingActionDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function toggleActionOwner(index: number, ownerId: string) {
    setMeetingActionDrafts((prev) => {
      const next = [...prev];
      const current = next[index].ownerIds;
      next[index] = {
        ...next[index],
        ownerIds: current.includes(ownerId)
          ? current.filter((o) => o !== ownerId)
          : [...current, ownerId],
      };
      return next;
    });
  }

  const availableTopics = (topics || []).filter((t) => !addedTopicIds.has(t.id));
  const availableProposals = (proposals || []).filter(
    (p) => p.status === "draft" || p.status === "open_for_discussion" || p.status === "ready_for_decision"
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

    // Decisions: link existing + record new.
    for (const id of linkedDecisionIds) {
      formData.append("linkDecisionId", id);
    }
    for (const d of newDecisions) {
      if (d.title.trim()) {
        formData.append("newDecisionTitle", d.title);
        formData.append("newDecisionMethod", d.method);
        formData.append("newDecisionOutcome", d.outcome);
      }
    }

    // Actions attached to the meeting.
    for (const a of meetingActionDrafts) {
      if (a.description.trim()) {
        formData.append("mActionDescription", a.description);
        formData.append("mActionOwnerName", a.ownerName);
        formData.append("mActionOwnerIds", a.ownerIds.join(";"));
        formData.append("mActionDueDate", a.dueDate);
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

        {/* Facilitator */}
        <div>
          <label htmlFor="facilitatorId" className="block text-sm font-medium text-bark mb-1.5">
            Facilitator
          </label>
          <select
            id="facilitatorId"
            name="facilitatorId"
            defaultValue={meeting?.facilitatorId || ""}
            className={inputClass}
          >
            <option value="">Meeting creator (default)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (availableProposals.length === 0) return;
                    setShowProposalPicker(!showProposalPicker);
                    setShowTopicPicker(false);
                  }}
                  disabled={availableProposals.length === 0}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    availableProposals.length === 0
                      ? "text-bark-muted/50 cursor-not-allowed"
                      : "text-canopy hover:text-canopy-light"
                  }`}
                >
                  <FileText size={14} />
                  Add proposal
                </button>
                {showProposalPicker && availableProposals.length > 0 && (
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
                            : proposal.status === "open_for_discussion"
                            ? "Open for discussion"
                            : "Draft"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

        {/* Decisions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-sm font-medium text-bark">
              <Gavel size={14} className="text-bark-muted" />
              Decisions <span className="font-normal text-bark-muted">(optional)</span>
            </span>
            <div className="flex items-center gap-3">
              {availableDecisions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDecisionPicker(!showDecisionPicker)}
                    className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
                  >
                    <FileText size={14} />
                    Link decision
                  </button>
                  {showDecisionPicker && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
                      {availableDecisions.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setLinkedDecisionIds((prev) => [...prev, d.id]);
                            setShowDecisionPicker(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors"
                        >
                          <span className="text-sm text-bark block truncate">
                            #{d.number} {d.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setNewDecisions((prev) => [...prev, { title: "", method: "consent", outcome: "" }])
                }
                className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
              >
                <Plus size={14} />
                Record decision
              </button>
            </div>
          </div>

          {linkedDecisionIds.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {linkedDecisionIds.map((id) => {
                const d = decisions.find((x) => x.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 bg-paper-warm rounded-lg border border-border"
                  >
                    <Gavel size={12} className="text-canopy shrink-0" />
                    <span className="text-sm text-bark flex-1 truncate">
                      {d ? `#${d.number} ${d.title}` : "Decision"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLinkedDecisionIds((prev) => prev.filter((x) => x !== id))
                      }
                      className="text-bark-muted hover:text-earth transition-colors"
                      aria-label="Unlink decision"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {newDecisions.map((d, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 bg-paper-warm rounded-lg border border-border"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={d.title}
                    onChange={(e) => updateNewDecision(i, "title", e.target.value)}
                    placeholder="Decision title"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    <select
                      value={d.method}
                      onChange={(e) => updateNewDecision(i, "method", e.target.value)}
                      className={`${inputClass} w-auto`}
                    >
                      {DECISION_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={d.outcome}
                      onChange={(e) => updateNewDecision(i, "outcome", e.target.value)}
                      placeholder="Outcome (optional)"
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewDecisions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-bark-muted hover:text-earth transition-colors mt-2"
                  aria-label="Remove decision"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {linkedDecisionIds.length === 0 && newDecisions.length === 0 && (
            <p className="text-sm text-bark-muted/60 py-1">
              Link decisions made in this meeting, or record new ones.
            </p>
          )}
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-sm font-medium text-bark">
              <ListChecks size={14} className="text-bark-muted" />
              Actions <span className="font-normal text-bark-muted">(optional)</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setMeetingActionDrafts((prev) => [
                  ...prev,
                  { description: "", ownerName: "", ownerIds: [], dueDate: "" },
                ])
              }
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={14} />
              Add action
            </button>
          </div>

          {meetingActionDrafts.length === 0 && (
            <p className="text-sm text-bark-muted/60 py-1">
              Capture follow-up actions and who is responsible.
            </p>
          )}

          <div className="space-y-3">
            {meetingActionDrafts.map((a, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 bg-paper-warm rounded-lg border border-border"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={a.description}
                    onChange={(e) => updateMeetingAction(i, "description", e.target.value)}
                    placeholder="What needs to be done?"
                    className={inputClass}
                  />
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <OwnerSelect
                        members={members}
                        selectedIds={a.ownerIds}
                        onToggle={(id) => toggleActionOwner(i, id)}
                        ownerName={a.ownerName}
                        onOwnerNameChange={(v) => updateMeetingAction(i, "ownerName", v)}
                      />
                    </div>
                    <input
                      type="date"
                      value={a.dueDate}
                      onChange={(e) => updateMeetingAction(i, "dueDate", e.target.value)}
                      className={`${inputClass} w-auto`}
                      title="Due date"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMeetingActionDrafts((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-bark-muted hover:text-earth transition-colors mt-2"
                  aria-label="Remove action"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Public visibility */}
        {publicEnabled && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="hideFromPublic"
                defaultChecked={!(meeting?.isPublic ?? true)}
                className="w-4 h-4 rounded border-border text-canopy focus:ring-canopy"
              />
              <EyeOff size={14} className="text-bark-muted" />
              <span className="text-sm text-bark">Hide from public page</span>
            </label>
          </div>
        )}

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
