"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <Suspense>
      <VerifyRequestContent />
    </Suspense>
  );
}

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-canopy-pale flex items-center justify-center mb-6">
        <Mail size={24} className="text-canopy" />
      </div>

      <h1
        className="text-2xl font-medium tracking-tight mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Check your email
      </h1>

      <p className="text-sm text-bark-muted leading-relaxed mb-8">
        {email ? (
          <>We sent a sign-in link to <strong className="text-bark font-medium">{email}</strong>.</>
        ) : (
          <>We sent you a sign-in link.</>
        )}{" "}
        Click the link in the email to continue.
      </p>

      <Link
        href="/sign-in"
        className="text-sm text-canopy hover:text-canopy-light transition-colors font-medium"
      >
        Back to sign in
      </Link>
    </div>
  );
}
