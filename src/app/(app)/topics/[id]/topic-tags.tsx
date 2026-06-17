"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateTopicTags } from "@/lib/topic-actions";
import { TagPicker, type TagOption } from "@/components/tag-picker";

/** Inline tag editor for the topic detail page — topics have no edit form,
 *  so this is how existing topics get tagged. */
export function TopicTags({
  topicId,
  allTags,
  initialTagIds,
}: {
  topicId: string;
  allTags: TagOption[];
  initialTagIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialTagIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (allTags.length === 0) return null;

  const changed =
    selected.length !== initialTagIds.length ||
    selected.some((id) => !initialTagIds.includes(id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateTopicTags(topicId, selected);
    setSaving(false);
    if (result && "error" in result) {
      setError(result.error as string);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <TagPicker
        tags={allTags}
        selectedIds={selected}
        onToggle={toggle}
        entityLabel="topics"
        id="topic-detail-tags"
      />
      {error && <p className="text-xs text-earth mt-2">{error}</p>}
      {changed && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-canopy text-paper rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          Save tags
        </button>
      )}
    </div>
  );
}
