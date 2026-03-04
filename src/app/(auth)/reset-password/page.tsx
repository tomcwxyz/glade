"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/auth-actions";
import { FormError } from "@/components/form-error";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <FormError message="Invalid reset link. Please request a new one." />
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-canopy hover:text-canopy-light transition-colors font-medium mt-4"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={40} className="text-canopy" />
        </div>
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Password reset
        </h1>
        <p className="text-sm text-bark-muted mb-6">
          Your password has been updated. You can now sign in.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("token", token!);
    formData.set("password", password);
    const result = await resetPassword(formData);

    if (result.error) setError(result.error);
    if (result.success) setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Choose a new password
        </h1>
        <p className="text-sm text-bark-muted">
          Must be at least 8 characters
        </p>
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-bark mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-bark mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              required
              minLength={8}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset password"}
        </button>
      </form>

      <p className="text-center mt-8">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
