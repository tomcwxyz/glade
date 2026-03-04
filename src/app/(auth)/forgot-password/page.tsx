"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("email", email);
    const result = await requestPasswordReset(formData);

    if (result.success) setMessage(result.success);
    if (result.error) setMessage(result.error);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Reset your password
        </h1>
        <p className="text-sm text-bark-muted">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-canopy/20 bg-canopy-pale p-4 mb-6">
          <p className="text-sm text-bark">{message}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-bark mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organisation.org"
              required
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
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
