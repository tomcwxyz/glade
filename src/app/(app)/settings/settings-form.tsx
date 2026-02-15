"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { updateSpace, deleteSpace } from "@/lib/space-actions";

const inputClass =
  "w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export function SpaceSettingsForm({
  name,
  description,
  slug,
  isAdmin,
}: {
  name: string;
  description: string;
  slug: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSpace(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSpace();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-12">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

      {/* General settings */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-bark mb-1.5">
            Space name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={name}
            disabled={!isAdmin}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-bark mb-1.5">
            Description
            <span className="font-normal text-bark-muted ml-1">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={description}
            disabled={!isAdmin}
            placeholder="What is this space for?"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">
            Slug
          </label>
          <div className="px-4 py-2.5 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted">
            {slug}
          </div>
        </div>

        {isAdmin && (
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : "Save changes"}
          </button>
        )}

        {!isAdmin && (
          <p className="text-sm text-bark-muted">
            Only space admins can modify settings.
          </p>
        )}
      </form>

      {/* Danger zone */}
      {isAdmin && (
        <section className="border border-earth/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TriangleAlert size={16} className="text-earth" />
            <h2 className="text-base font-medium text-earth" style={{ fontFamily: "var(--font-display)" }}>
              Danger zone
            </h2>
          </div>
          <p className="text-sm text-bark-muted mb-4">
            Deleting this space will permanently remove all decisions, meetings, actions, and members. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-earth border border-earth/30 rounded-lg hover:bg-earth/5 transition-colors"
            >
              Delete this space
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-bark">
                Type <strong>{name}</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={name}
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== name || isPending}
                  className="px-4 py-2 text-sm font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Deleting..." : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-4 py-2 text-sm text-bark-muted hover:text-bark transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
