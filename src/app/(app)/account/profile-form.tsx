"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateProfile } from "@/lib/user-actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData();
    form.set("name", value);
    startTransition(async () => {
      const result = await updateProfile(form);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: result?.success || "Saved." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {message && (
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            message.type === "error"
              ? "bg-earth/8 border border-earth/20 text-earth"
              : "bg-canopy-pale border border-canopy/20 text-canopy"
          }`}
        >
          {message.text}
        </div>
      )}
      <div>
        <label htmlFor="account-name" className="block text-sm font-medium text-bark mb-1.5">
          Display name
        </label>
        <input
          id="account-name"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
        />
      </div>
      <div>
        <label htmlFor="account-email" className="block text-sm font-medium text-bark mb-1.5">
          Email
        </label>
        <input
          id="account-email"
          type="email"
          value={email}
          readOnly
          disabled
          className="w-full px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted"
        />
        <p className="text-xs text-bark-muted/70 mt-1">Email is used to sign in and can&apos;t be changed here.</p>
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim() || value.trim() === name}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-canopy text-paper rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
      >
        {isPending && <Loader2 size={15} className="animate-spin" />}
        Save changes
      </button>
    </form>
  );
}
