"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import { FormError } from "@/components/form-error";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading("credentials");
    await signIn("credentials", { email, password, callbackUrl });
    setLoading(null);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("resend");
    await signIn("resend", { email, callbackUrl });
    setLoading(null);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome back
        </h1>
        <p className="text-sm text-bark-muted">
          Sign in to your Glade account
        </p>
      </div>

      <FormError message={error === "CredentialsSignin" ? "Invalid email or password" : error ? "Something went wrong. Please try again." : null} />

      {/* Email + password form */}
      <form onSubmit={handleCredentials} className="space-y-4">
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              aria-required="true"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading === "credentials"}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading === "credentials" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-paper px-3 text-xs text-bark-muted">or</span>
        </div>
      </div>

      {/* Magic link */}
      <button
        onClick={handleMagicLink}
        disabled={!email || loading === "resend"}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-bark hover:bg-paper-warm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3"
      >
        {loading === "resend" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Mail size={15} />
            Send magic link to {email || "..."}
          </>
        )}
      </button>

      {/* OAuth providers */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setLoading("google");
            signIn("google", { callbackUrl });
          }}
          disabled={loading === "google"}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-bark hover:bg-paper-warm transition-colors disabled:opacity-60"
        >
          Google
        </button>
        <button
          onClick={() => {
            setLoading("microsoft-entra-id");
            signIn("microsoft-entra-id", { callbackUrl });
          }}
          disabled={loading === "microsoft-entra-id"}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-bark hover:bg-paper-warm transition-colors disabled:opacity-60"
        >
          Microsoft
        </button>
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-bark-muted mt-8">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-canopy hover:text-canopy-light transition-colors font-medium"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
