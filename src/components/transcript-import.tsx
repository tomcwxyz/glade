"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDot,
  FileUp,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { extractFromTranscript } from "@/lib/ai-actions";
import type { TranscriptExtraction } from "@/lib/ai-actions";
import { importTranscript } from "@/lib/meeting-actions";

type Props = {
  spaceId: string;
  existingMeeting: {
    id: string;
    title: string;
    date: string;
    type: string | null;
  } | null;
  memberNames: string[];
};

type Stage = "input" | "preview" | "confirm";

const MEETING_TYPES = [
  { value: "board", label: "Board Meeting" },
  { value: "team", label: "Team Meeting" },
  { value: "agm", label: "AGM" },
  { value: "egm", label: "EGM" },
  { value: "committee", label: "Committee" },
  { value: "working_group", label: "Working Group" },
  { value: "other", label: "Other" },
];

const DECISION_METHODS = [
  { value: "consensus", label: "Consensus" },
  { value: "consent", label: "Consent" },
  { value: "majority_vote", label: "Majority vote" },
  { value: "advice_process", label: "Advice process" },
  { value: "delegation", label: "Delegation" },
  { value: "lazy_consensus", label: "Lazy consensus" },
];

const TOPIC_TYPES = [
  { value: "question", label: "Question" },
  { value: "tension", label: "Tension" },
  { value: "agenda_suggestion", label: "Agenda suggestion" },
];

export function TranscriptImport({ spaceId, existingMeeting, memberNames }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Stage
  const [stage, setStage] = useState<Stage>("input");

  // Input stage
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [meetingType, setMeetingType] = useState("board");

  // Preview stage
  const [extraction, setExtraction] = useState<TranscriptExtraction | null>(null);
  const [saveNotes, setSaveNotes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation
  const [saving, startSaving] = useTransition();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "txt" || ext === "md") {
      const text = await file.text();
      setTranscript(text);
    } else if (ext === "docx") {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setTranscript(result.value);
      } catch {
        setError("Failed to read .docx file. Please try pasting the text instead.");
      }
    } else {
      setError("Unsupported file type. Please use .txt, .md, or .docx.");
    }

    // Reset file input
    e.target.value = "";
  }

  function handleExtract() {
    if (!transcript.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await extractFromTranscript(
          transcript,
          existingMeeting?.id
        );

        if ("error" in result) {
          setError((result as { error: string }).error);
          return;
        }

        setExtraction(result as TranscriptExtraction);
        setStage("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleSave() {
    if (!extraction) return;

    startSaving(async () => {
      const result = await importTranscript({
        mode: existingMeeting ? "existing" : "new",
        meetingId: existingMeeting?.id,
        title: existingMeeting ? undefined : title || "Imported meeting",
        date: existingMeeting ? undefined : date,
        type: existingMeeting ? undefined : meetingType,
        transcript,
        saveNotesFromSummary: saveNotes,
        summary: extraction.summary,
        decisions: extraction.decisions,
        actions: extraction.actions,
        topics: extraction.topics,
      });

      if ("error" in result) {
        setError((result as { error: string }).error);
        return;
      }

      router.push(`/meetings/${(result as { meetingId: string }).meetingId}`);
    });
  }

  // Edit helpers for preview stage
  function updateDecision(index: number, field: string, value: string) {
    if (!extraction) return;
    const updated = [...extraction.decisions];
    updated[index] = { ...updated[index], [field]: value };
    setExtraction({ ...extraction, decisions: updated });
  }

  function removeDecision(index: number) {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      decisions: extraction.decisions.filter((_, i) => i !== index),
    });
  }

  function addDecision() {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      decisions: [
        ...extraction.decisions,
        { title: "", description: "", method: "consensus", outcome: "" },
      ],
    });
  }

  function updateAction(index: number, field: string, value: string | null) {
    if (!extraction) return;
    const updated = [...extraction.actions];
    updated[index] = { ...updated[index], [field]: value };
    setExtraction({ ...extraction, actions: updated });
  }

  function removeAction(index: number) {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      actions: extraction.actions.filter((_, i) => i !== index),
    });
  }

  function addAction() {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      actions: [
        ...extraction.actions,
        { description: "", ownerName: null, dueDate: null },
      ],
    });
  }

  function updateTopic(index: number, field: string, value: string) {
    if (!extraction) return;
    const updated = [...extraction.topics];
    updated[index] = { ...updated[index], [field]: value };
    setExtraction({ ...extraction, topics: updated });
  }

  function removeTopic(index: number) {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      topics: extraction.topics.filter((_, i) => i !== index),
    });
  }

  function addTopic() {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      topics: [
        ...extraction.topics,
        { title: "", description: "", type: "question" },
      ],
    });
  }

  // --- INPUT STAGE ---
  if (stage === "input") {
    return (
      <div className="space-y-6">
        {/* Meeting details for new meeting mode */}
        {!existingMeeting && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-bark mb-1.5">
                Meeting title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Board meeting — March 2026"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-bark text-sm focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-bark text-sm focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark mb-1.5">
                Meeting type
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-bark text-sm focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">
            Upload transcript
          </label>
          <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg bg-paper-deep hover:bg-paper-warm transition-colors cursor-pointer text-sm text-bark-muted">
            <FileUp size={16} />
            <span>Choose a .txt, .md, or .docx file</span>
            <input
              type="file"
              accept=".txt,.md,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Textarea */}
        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">
            Or paste transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={14}
            placeholder="Paste your meeting notes or transcript here..."
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-bark text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy resize-y font-mono"
          />
          <p className="text-xs text-bark-muted mt-1.5">
            {transcript.length > 0
              ? `${transcript.split(/\s+/).filter(Boolean).length} words`
              : "No text yet"}
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-earth/5 border border-earth/20 rounded-lg text-sm text-earth">
            {error}
          </div>
        )}

        {/* Extract button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExtract}
            disabled={!transcript.trim() || isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extract decisions & actions
              </>
            )}
          </button>
          {isPending && (
            <span className="text-sm text-bark-muted">
              This may take a moment...
            </span>
          )}
        </div>
      </div>
    );
  }

  // --- PREVIEW STAGE ---
  if (stage === "preview" && extraction) {
    const totalItems =
      extraction.decisions.length +
      extraction.actions.length +
      extraction.topics.length;

    return (
      <div className="space-y-8">
        {/* Summary */}
        {extraction.summary && (
          <div className="bg-canopy-pale/50 border border-canopy/10 rounded-xl p-5">
            <h3 className="text-sm font-medium text-bark mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-canopy" />
              AI Summary
            </h3>
            <p className="text-sm text-bark leading-relaxed">
              {extraction.summary}
            </p>
            <label className="flex items-center gap-2 mt-3 text-sm text-bark-muted cursor-pointer">
              <input
                type="checkbox"
                checked={saveNotes}
                onChange={(e) => setSaveNotes(e.target.checked)}
                className="rounded border-border"
              />
              Save as meeting notes
            </label>
          </div>
        )}

        {/* Decisions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
              <CircleDot size={13} />
              Decisions ({extraction.decisions.length})
            </h3>
            <button
              onClick={addDecision}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
          {extraction.decisions.length === 0 && (
            <p className="text-sm text-bark-muted italic">
              No decisions extracted.
            </p>
          )}
          <div className="space-y-4">
            {extraction.decisions.map((d, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-4 bg-paper space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={d.title}
                    onChange={(e) => updateDecision(i, "title", e.target.value)}
                    placeholder="Decision title"
                    className="flex-1 px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                  />
                  <button
                    onClick={() => removeDecision(i)}
                    className="p-1 text-bark-muted hover:text-earth transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={d.description}
                  onChange={(e) =>
                    updateDecision(i, "description", e.target.value)
                  }
                  placeholder="Description"
                  rows={2}
                  className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20 resize-y"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-bark-muted mb-1 block">
                      Method
                    </label>
                    <select
                      value={d.method}
                      onChange={(e) =>
                        updateDecision(i, "method", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                    >
                      {DECISION_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-bark-muted mb-1 block">
                      Outcome
                    </label>
                    <input
                      type="text"
                      value={d.outcome}
                      onChange={(e) =>
                        updateDecision(i, "outcome", e.target.value)
                      }
                      placeholder="The agreed outcome"
                      className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
              <CheckCircle2 size={13} />
              Actions ({extraction.actions.length})
            </h3>
            <button
              onClick={addAction}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
          {extraction.actions.length === 0 && (
            <p className="text-sm text-bark-muted italic">
              No actions extracted.
            </p>
          )}
          <div className="space-y-3">
            {extraction.actions.map((a, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-4 bg-paper space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={a.description}
                    onChange={(e) =>
                      updateAction(i, "description", e.target.value)
                    }
                    placeholder="Action description"
                    className="flex-1 px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                  />
                  <button
                    onClick={() => removeAction(i)}
                    className="p-1 text-bark-muted hover:text-earth transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-bark-muted mb-1 block">
                      Owner
                    </label>
                    <input
                      type="text"
                      value={a.ownerName || ""}
                      onChange={(e) =>
                        updateAction(
                          i,
                          "ownerName",
                          e.target.value || null
                        )
                      }
                      placeholder="Person responsible"
                      list="member-names"
                      className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-bark-muted mb-1 block">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={a.dueDate || ""}
                      onChange={(e) =>
                        updateAction(
                          i,
                          "dueDate",
                          e.target.value || null
                        )
                      }
                      className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Topics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
              <Lightbulb size={13} />
              Topics ({extraction.topics.length})
            </h3>
            <button
              onClick={addTopic}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
          {extraction.topics.length === 0 && (
            <p className="text-sm text-bark-muted italic">
              No topics extracted.
            </p>
          )}
          <div className="space-y-3">
            {extraction.topics.map((t, i) => (
              <div
                key={i}
                className="border border-border rounded-lg p-4 bg-paper space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={t.title}
                    onChange={(e) => updateTopic(i, "title", e.target.value)}
                    placeholder="Topic title"
                    className="flex-1 px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                  />
                  <button
                    onClick={() => removeTopic(i)}
                    className="p-1 text-bark-muted hover:text-earth transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) =>
                      updateTopic(i, "description", e.target.value)
                    }
                    placeholder="Brief description"
                    className="w-full px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                  />
                  <select
                    value={t.type}
                    onChange={(e) => updateTopic(i, "type", e.target.value)}
                    className="px-2 py-1.5 border border-border rounded bg-paper-deep text-sm text-bark focus:outline-none focus:ring-1 focus:ring-canopy/20"
                  >
                    {TOPIC_TYPES.map((tt) => (
                      <option key={tt.value} value={tt.value}>
                        {tt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Member name datalist */}
        {memberNames.length > 0 && (
          <datalist id="member-names">
            {memberNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}

        {error && (
          <div className="px-4 py-3 bg-earth/5 border border-earth/20 rounded-lg text-sm text-earth">
            {error}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={() => setStage("input")}
            className="flex items-center gap-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
          >
            <X size={14} />
            Back to transcript
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-bark-muted">
              {totalItems} item{totalItems !== 1 ? "s" : ""} to import
            </span>
            <button
              onClick={handleSave}
              disabled={saving || totalItems === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm & save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
