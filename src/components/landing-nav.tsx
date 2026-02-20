"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, TreePine, X } from "lucide-react";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-canopy text-paper">
            <TreePine size={18} strokeWidth={2.5} />
          </div>
          <span
            className="text-lg tracking-tight font-semibold text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Glade
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center gap-1.5 px-4 py-2 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
          >
            Start your glade
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden mt-3 pt-3 border-t border-border space-y-1">
          <Link
            href="#features"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-bark-muted hover:text-bark hover:bg-paper-deep rounded-lg transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-bark-muted hover:text-bark hover:bg-paper-deep rounded-lg transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-bark-muted hover:text-bark hover:bg-paper-deep rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-canopy hover:bg-canopy-pale rounded-lg transition-colors"
          >
            Start your glade
          </Link>
        </div>
      )}
    </nav>
  );
}
