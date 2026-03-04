"use client";

import { Suspense, useState } from "react";
import { signUp } from "@/lib/auth-actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, User, Loader2 } from "lucide-react";
import { FormError } from "@/components/form-error";

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success redirects via signIn in the server action
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create your account
        </h1>
        <p className="text-sm text-bark-muted">
          {inviteToken
            ? "Create an account to join the space you were invited to"
            : "Start building your organisation\u2019s governance memory"}
        </p>
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {inviteToken && (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-bark mb-1.5">
            Full name
          </label>
          <div className="relative">
            <User
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted"
            />
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              required
              aria-required="true"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-bark mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted"
            />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@organisation.org"
              required
              aria-required="true"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-bark mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted"
            />
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              aria-required="true"
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
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-bark-muted mt-8">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-canopy hover:text-canopy-light transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
