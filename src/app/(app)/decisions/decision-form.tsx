"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDecision, updateDecision } from "@/lib/decision-actions";
import { suggestDecisionTags } from "@/lib/ai-actions";
import { inputClass, textareaClass, tagDotClass } from "@/lib/utils";
import {
  EyeOff,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/form-error";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Member {
  id: string;
  name: string;
}

interface DecisionData {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  method: string;
  outcome: string | null;
  status: string;
  participants: string[];
  date: string; // ISO string
  conditions: string | null;
  reviewDate: string | null; // ISO string
  tagIds: string[];
  isPublic: boolean;
}

const METHODS = [
  { value: "consent", label: "Consent", desc: "Adopted unless a paramount objection is raised" },
  { value: "majority_vote", label: "Majority Vote", desc: "Passed by majority of those present" },
  { value: "advice_process", label: "Advice Process", desc: "Decision-maker consults affected parties" },
  { value: "delegation", label: "Delegation", desc: "Authority delegated with defined scope" },
  { value: "consensus", label: "Consensus", desc: "Full agreement by all participants" },
  { value: "lazy_consensus", label: "Lazy Consensus", desc: "Adopted after objection window closes" },
] as const;

const STATUSES = [
  { value: "decided", label: "Decided" },
  { value: "implemented", label: "Implemented" },
  { value: "reviewed", label: "Reviewed" },
  { value: "learned", label: "Learned" },
] as const;

function InputLabel({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-bark mb-1.5">
      {children}
      {optional && <span className="font-normal text-bark-muted ml-1">(optional)</span>}
    </label>
  );
}


export function DecisionForm({
  tags,
  members,
  decision,
  publicEnabled,
  aiEnabled,
}: {
  tags: Tag[];
  members: Member[];
  decision?: DecisionData;
  publicEnabled?: boolean;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const isEditing = !!decision;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Participants as string names
  const [participants, setParticipants] = useState<string[]>(
    decision?.participants || []
  );
  const [participantInput, setParticipantInput] = useState("");

  // Selected tag IDs
  const [selectedTags, setSelectedTags] = useState<string[]>(
    decision?.tagIds || []
  );
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  async function handleSuggestTags(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");
    const fd = form ? new FormData(form) : null;
    const title = (fd?.get("title") as string) || "";
    const description = (fd?.get("description") as string) || "";
    const rationale = (fd?.get("rationale") as string) || "";
    setSuggestingTags(true);
    setTagError(null);
    try {
      const result = await suggestDecisionTags(title, description, rationale);
      if ("error" in result) {
        setTagError(result.error as string);
        return;
      }
      const ids = result.tagIds as string[];
      setSelectedTags((prev) => Array.from(new Set([...prev, ...ids])));
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSuggestingTags(false);
    }
  }

  // Action items
  const [actionItems, setActionItems] = useState<
    { description: string; owner: string; dueDate: string }[]
  >([]);

  function addParticipant(name: string) {
    const trimmed = name.trim();
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants([...participants, trimmed]);
    }
    setParticipantInput("");
  }

  function removeParticipant(name: string) {
    setParticipants(participants.filter((p) => p !== name));
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }

  function addAction() {
    setActionItems([...actionItems, { description: "", owner: "", dueDate: "" }]);
  }

  function removeAction(index: number) {
    setActionItems(actionItems.filter((_, i) => i !== index));
  }

  function updateAction(index: number, field: string, value: string) {
    setActionItems(
      actionItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add participants and tags as comma-separated values
    formData.set("participants", participants.join(","));
    formData.set("tagIds", selectedTags.join(","));

    // Remove the individual action fields first, then add them properly
    formData.delete("actionDescription");
    formData.delete("actionOwner");
    formData.delete("actionDueDate");

    for (const action of actionItems) {
      if (action.description.trim()) {
        formData.append("actionDescription", action.description);
        formData.append("actionOwner", action.owner);
        formData.append("actionDueDate", action.dueDate);
      }
    }

    const result = isEditing
      ? await updateDecision(decision!.id, formData)
      : await createDecision(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success redirects via server action
  }

  // Format date for input[type="date"]
  function toDateInputValue(isoString: string | null | undefined): string {
    if (!isoString) return "";
    return isoString.split("T")[0];
  }

  return (
    <>
      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <InputLabel htmlFor="title">Title</InputLabel>
          <input
            id="title"
            name="title"
            type="text"
            required
            aria-required="true"
            defaultValue={decision?.title || ""}
            placeholder="What was decided?"
            className={inputClass}
          />
        </div>

        {/* Method & Status row */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <InputLabel htmlFor="method">Decision method</InputLabel>
            <select
              id="method"
              name="method"
              required
              aria-required="true"
              defaultValue={decision?.method || "consent"}
              className={inputClass}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <InputLabel htmlFor="status">Status</InputLabel>
            <select
              id="status"
              name="status"
              defaultValue={decision?.status || "decided"}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Review date */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <InputLabel htmlFor="date">Decision date</InputLabel>
            <input
              id="date"
              name="date"
              type="date"
              required
              aria-required="true"
              defaultValue={
                toDateInputValue(decision?.date) ||
                new Date().toISOString().split("T")[0]
              }
              className={inputClass}
            />
          </div>

          <div>
            <InputLabel htmlFor="reviewDate" optional>
              Review date
            </InputLabel>
            <input
              id="reviewDate"
              name="reviewDate"
              type="date"
              defaultValue={toDateInputValue(decision?.reviewDate)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Context / Description */}
        <div>
          <InputLabel htmlFor="description" optional>
            Context
          </InputLabel>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={decision?.description || ""}
            placeholder="What situation or need prompted this decision?"
            className={textareaClass}
          />
        </div>

        {/* Outcome */}
        <div>
          <InputLabel htmlFor="outcome" optional>
            Outcome
          </InputLabel>
          <textarea
            id="outcome"
            name="outcome"
            rows={3}
            defaultValue={decision?.outcome || ""}
            placeholder="What was the specific result or commitment?"
            className={textareaClass}
          />
        </div>

        {/* Rationale */}
        <div>
          <InputLabel htmlFor="rationale" optional>
            Rationale
          </InputLabel>
          <textarea
            id="rationale"
            name="rationale"
            rows={3}
            defaultValue={decision?.rationale || ""}
            placeholder="Why was this the right choice? What alternatives were considered?"
            className={textareaClass}
          />
        </div>

        {/* Conditions */}
        <div>
          <InputLabel htmlFor="conditions" optional>
            Conditions or constraints
          </InputLabel>
          <textarea
            id="conditions"
            name="conditions"
            rows={2}
            defaultValue={decision?.conditions || ""}
            placeholder="Any limits, boundaries, or conditions attached to this decision?"
            className={textareaClass}
          />
        </div>

        {/* Participants */}
        <div>
          <InputLabel htmlFor="participant-input">Participants</InputLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {participants.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-canopy-pale text-canopy text-xs font-medium"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeParticipant(name)}
                  className="hover:text-earth transition-colors"
                  aria-label={`Remove ${name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id="participant-input"
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant(participantInput);
                }
              }}
              placeholder="Type a name and press Enter"
              className={inputClass}
              list="member-suggestions"
            />
            <datalist id="member-suggestions">
              {members.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => addParticipant(participantInput)}
              className="px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between">
            <InputLabel htmlFor="tags-section">Tags</InputLabel>
            {aiEnabled && tags.length > 0 && (
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={suggestingTags}
                className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors disabled:opacity-50"
              >
                {suggestingTags ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Suggest tags
              </button>
            )}
          </div>
          {tagError && <p className="text-xs text-earth mb-2">{tagError}</p>}
          {tags.length > 0 ? (
            <div id="tags-section" className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-canopy-pale text-canopy border-canopy/30"
                        : "bg-paper-warm text-bark-muted border-border hover:border-canopy/30 hover:text-bark"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tagDotClass(tag.color)}`} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p id="tags-section" className="text-sm text-bark-muted">
              No tags yet.{" "}
              <Link href="/settings" className="text-canopy hover:text-canopy-light underline">
                Create tags in Settings
              </Link>{" "}
              to group decisions by theme.
            </p>
          )}
        </div>

        {/* Action Items */}
        {!isEditing && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <InputLabel htmlFor="actions-section">
                Action items
              </InputLabel>
              <button
                type="button"
                onClick={addAction}
                className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
              >
                <Plus size={14} />
                Add action
              </button>
            </div>

            {actionItems.length === 0 && (
              <p className="text-sm text-bark-muted/60 py-3">
                No actions yet. Add follow-up actions to track implementation.
              </p>
            )}

            <div id="actions-section" className="space-y-3">
              {actionItems.map((action, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-3 bg-paper-warm rounded-lg border border-border"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={action.description}
                      onChange={(e) =>
                        updateAction(i, "description", e.target.value)
                      }
                      placeholder="What needs to happen?"
                      className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={action.owner}
                        onChange={(e) =>
                          updateAction(i, "owner", e.target.value)
                        }
                        placeholder="Who's responsible?"
                        className={inputClass}
                        list="member-suggestions"
                      />
                      <input
                        type="date"
                        value={action.dueDate}
                        onChange={(e) =>
                          updateAction(i, "dueDate", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="text-bark-muted hover:text-earth transition-colors mt-2"
                    aria-label="Remove action"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public visibility */}
        {publicEnabled && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="hideFromPublic"
                defaultChecked={!(decision?.isPublic ?? true)}
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
              "Log decision"
            )}
          </button>
          <Link
            href="/decisions"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
