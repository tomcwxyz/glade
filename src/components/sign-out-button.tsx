"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors w-full"
      >
        <LogOut size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
        {!collapsed && <span>Sign out</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/20 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className="bg-paper rounded-xl shadow-lg border border-border p-6 w-full max-w-xs mx-4"
          >
            <h2
              id="signout-title"
              className="text-lg font-medium tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sign out?
            </h2>
            <p className="text-sm text-bark-muted mb-6">
              You&apos;ll need to sign in again to access your spaces.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-bark hover:bg-paper-warm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-earth text-paper rounded-lg text-sm font-medium hover:bg-earth/90 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignOutButtonMobile({ onClick }: { onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleSignOut() {
    setLoading(true);
    onClick?.();
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm min-h-[44px] text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors w-full"
      >
        <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
        Sign out
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bark/20 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title-mobile"
            className="bg-paper rounded-xl shadow-lg border border-border p-6 w-full max-w-xs mx-4"
          >
            <h2
              id="signout-title-mobile"
              className="text-lg font-medium tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sign out?
            </h2>
            <p className="text-sm text-bark-muted mb-6">
              You&apos;ll need to sign in again to access your spaces.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-bark hover:bg-paper-warm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-earth text-paper rounded-lg text-sm font-medium hover:bg-earth/90 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
