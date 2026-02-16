"use client";

import { useState } from "react";
import { createMeeting, updateMeeting } from "@/lib/meeting-actions";
import { ArrowLeft, Check, Loader2, Plus, X, MessageSquarePlus } from "lucide-react";
import Link from "next/link";

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

interface MeetingData {
  id: string;
  title: string;
  date: string;
  type: string | null;
  notes: string | null;
  attendeeIds: string[];
  agendaItems: { title: string; description: string; type: string }[];
}

const MEETING_TYPES = [
  "Board Meeting",
  "Team Meeting",
  "Working Group",
  "AGM",
  "Committee",
  "Other",
];

const TOPIC_TYPE_TO_AGENDA: Record<string, string> = {
  question: "for_discussion",
  tension: "for_discussion",
  agenda_suggestion: "for_discussion",
};

const inputClass =
  "w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export function MeetingForm({
  members,
  meeting,
  topics,
}: {
  members: Member[];
  meeting?: MeetingData;
  topics?: Topic[];
}) {
  const isEditing = !!meeting;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(
    meeting?.attendeeIds || []
  );
  const [agendaItems, setAgendaItems] = useState<
    { title: string; description: string; type: string }[]
  >(meeting?.agendaItems || []);
  const [addedTopicIds, setAddedTopicIds] = useState<Set<string>>(new Set());
  const [showTopicPicker, setShowTopicPicker] = useState(false);

  const availableTopics = (topics || []).filter((t) => !addedTopicIds.has(t.id));

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function addTopicAsAgendaItem(topic: Topic) {
    setAgendaItems((prev) => [
      ...prev,
      {
        title: topic.title,
        description: topic.description || "",
        type: TOPIC_TYPE_TO_AGENDA[topic.type] || "for_discussion",
      },
    ]);
    setAddedTopicIds((prev) => new Set([...prev, topic.id]));
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
    for (const item of agendaItems) {
      if (item.title.trim()) {
        formData.append("agendaTitle", item.title);
        formData.append("agendaDescription", item.description);
        formData.append("agendaType", item.type);
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

  return (
    <>
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Meetings
      </Link>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

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
            defaultValue={meeting?.title || ""}
            placeholder="e.g. Board Meeting — February 2026"
            className={inputClass}
          />
        </div>

        {/* Date & Type */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-bark mb-1.5">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
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
            <label className="block text-sm font-medium text-bark">
              Agenda <span className="font-normal text-bark-muted">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              {availableTopics.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTopicPicker(!showTopicPicker)}
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
                  setAgendaItems([
                    ...agendaItems,
                    { title: "", description: "", type: "for_discussion" },
                  ])
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
                    onChange={(e) => {
                      const updated = [...agendaItems];
                      updated[i] = { ...updated[i], title: e.target.value };
                      setAgendaItems(updated);
                    }}
                    placeholder="Agenda item title"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...agendaItems];
                        updated[i] = { ...updated[i], description: e.target.value };
                        setAgendaItems(updated);
                      }}
                      placeholder="Brief description (optional)"
                      className={inputClass}
                    />
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const updated = [...agendaItems];
                        updated[i] = { ...updated[i], type: e.target.value };
                        setAgendaItems(updated);
                      }}
                      className={`${inputClass} w-auto`}
                    >
                      <option value="for_discussion">For discussion</option>
                      <option value="for_decision">For decision</option>
                      <option value="for_information">For information</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAgendaItems(agendaItems.filter((_, idx) => idx !== i))
                  }
                  className="text-bark-muted hover:text-earth transition-colors mt-2"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
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
