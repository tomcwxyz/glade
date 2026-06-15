"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { switchSpace } from "@/lib/space-actions";
import type { SpaceInfo, UserSpace } from "./app-shell";
import { SignOutButtonMobile } from "./sign-out-button";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  CircleDot,
  FileText,
  Home,
  Lightbulb,
  ListChecks,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  TreePine,
  UserCircle,
  Users,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/glade", label: "The Glade", icon: CircleDot },
  { href: "/decisions", label: "Decisions", icon: BookOpen },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/proposals", label: "Proposals", icon: MessageSquare },
  { href: "/topics", label: "Topics", icon: Lightbulb },
];

const BOTTOM_ITEMS = [
  { href: "/members", label: "Members", icon: Users },
  { href: "/account", label: "Account", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface MobileNavProps {
  currentSpace: SpaceInfo;
  userSpaces: UserSpace[];
}

export function MobileNav({ currentSpace, userSpaces }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const spaceSwitcherRef = useRef<HTMLDivElement>(null);
  const spaceSwitcherButtonRef = useRef<HTMLButtonElement>(null);

  // Reset focus index when space switcher opens/closes
  useEffect(() => {
    setFocusedIndex(spaceSwitcherOpen ? 0 : -1);
  }, [spaceSwitcherOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !spaceSwitcherRef.current) return;
    const items = spaceSwitcherRef.current.querySelectorAll("[role='option']");
    if (items[focusedIndex]) {
      items[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const handleSpaceSwitcherKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!spaceSwitcherOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSpaceSwitcherOpen(true);
        }
        return;
      }

      const itemCount = userSpaces.length + 1; // spaces + "Create new"
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setSpaceSwitcherOpen(false);
          spaceSwitcherButtonRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex < userSpaces.length) {
            const space = userSpaces[focusedIndex];
            setSpaceSwitcherOpen(false);
            setOpen(false);
            if (space.slug !== currentSpace.slug) switchSpace(space.slug);
          } else {
            setSpaceSwitcherOpen(false);
            setOpen(false);
            window.location.href = "/new-space";
          }
          break;
      }
    },
    [spaceSwitcherOpen, userSpaces, focusedIndex, currentSpace.slug]
  );

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-paper-warm">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-canopy text-paper shrink-0">
            <TreePine size={15} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {currentSpace.name}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* Dropdown nav */}
      {open && (
        <nav aria-label="Main navigation" className="px-3 py-2 border-b border-border bg-paper-warm">
          {/* Space switcher */}
          {userSpaces.length > 1 && (
            <div ref={spaceSwitcherRef} className="relative mb-1">
              <button
                ref={spaceSwitcherButtonRef}
                onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
                onKeyDown={handleSpaceSwitcherKeyDown}
                aria-expanded={spaceSwitcherOpen}
                aria-haspopup="listbox"
                aria-label="Switch space"
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm min-h-[44px] transition-colors text-bark-muted hover:text-bark hover:bg-paper-deep"
              >
                <div className="w-5 h-5 rounded bg-canopy-pale flex items-center justify-center shrink-0">
                  <span className="text-[0.5625rem] font-bold text-canopy">
                    {currentSpace.name[0]}
                  </span>
                </div>
                <span className="flex-1 text-left">Switch space</span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 transition-transform",
                    spaceSwitcherOpen && "rotate-180"
                  )}
                />
              </button>

              {spaceSwitcherOpen && (
                <div role="listbox" aria-label="Spaces" className="ml-8 mb-1 space-y-0.5">
                  {userSpaces.map((space, i) => (
                    <button
                      key={space.id}
                      role="option"
                      aria-selected={space.slug === currentSpace.slug}
                      onClick={async () => {
                        setSpaceSwitcherOpen(false);
                        setOpen(false);
                        if (space.slug !== currentSpace.slug) {
                          await switchSpace(space.slug);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px] text-left hover:bg-paper-deep transition-colors",
                        focusedIndex === i && "bg-paper-deep"
                      )}
                    >
                      <div className="w-5 h-5 rounded bg-canopy-pale flex items-center justify-center shrink-0">
                        <span className="text-[0.5rem] font-bold text-canopy">
                          {space.name[0]}
                        </span>
                      </div>
                      <span className="text-bark truncate flex-1">{space.name}</span>
                      {space.slug === currentSpace.slug && (
                        <Check size={14} className="text-canopy shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                  <div
                    role="option"
                    aria-selected={false}
                  >
                    <Link
                      href="/new-space"
                      onClick={() => { setSpaceSwitcherOpen(false); setOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px] text-left hover:bg-paper-deep transition-colors text-bark-muted",
                        focusedIndex === userSpaces.length && "bg-paper-deep"
                      )}
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>Create new space</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main nav items */}
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm min-h-[44px] transition-colors",
                    isActive
                      ? "bg-canopy-pale text-canopy font-medium"
                      : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Bottom items + sign out */}
          <div className="mt-1 pt-1 border-t border-border/50 space-y-0.5">
            {BOTTOM_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm min-h-[44px] transition-colors",
                    isActive
                      ? "bg-canopy-pale text-canopy font-medium"
                      : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}

            <SignOutButtonMobile onClick={() => setOpen(false)} />
          </div>
        </nav>
      )}
    </div>
  );
}
