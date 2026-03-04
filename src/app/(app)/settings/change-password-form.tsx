"use client";

import { useState } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { changePassword } from "@/lib/auth-actions";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    const result = await changePassword(formData);

    if (result.error) setError(result.error);
    if (result.success) {
      setSuccess(result.success);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-earth/20 bg-earth/5 px-4 py-3">
          <p className="text-sm text-earth">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-canopy/20 bg-canopy-pale px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-canopy shrink-0" />
          <p className="text-sm text-bark">{success}</p>
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-bark mb-1.5">
          Current password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-bark mb-1.5">
          New password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-bark mb-1.5">
          Confirm new password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
            minLength={8}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : "Change password"}
      </button>
    </form>
  );
}
