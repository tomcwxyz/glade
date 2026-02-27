"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { switchSpace } from "@/lib/space";
import type { SpaceInfo, UserSpace } from "./app-shell";
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
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  TreePine,
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

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-paper-warm">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-canopy text-paper shrink-0">
            <TreePine size={15} strokeWidth={2.5} />
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
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Dropdown nav */}
      {open && (
        <nav aria-label="Main navigation" className="px-3 py-2 border-b border-border bg-paper-warm">
          {/* Space switcher */}
          {userSpaces.length > 1 && (
            <div className="relative mb-1">
              <button
                onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
                aria-expanded={spaceSwitcherOpen}
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
                  className={cn(
                    "shrink-0 transition-transform",
                    spaceSwitcherOpen && "rotate-180"
                  )}
                />
              </button>

              {spaceSwitcherOpen && (
                <div className="ml-8 mb-1 space-y-0.5">
                  {userSpaces.map((space) => (
                    <button
                      key={space.id}
                      onClick={async () => {
                        setSpaceSwitcherOpen(false);
                        setOpen(false);
                        if (space.slug !== currentSpace.slug) {
                          await switchSpace(space.slug);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px] text-left hover:bg-paper-deep transition-colors"
                    >
                      <div className="w-5 h-5 rounded bg-canopy-pale flex items-center justify-center shrink-0">
                        <span className="text-[0.5rem] font-bold text-canopy">
                          {space.name[0]}
                        </span>
                      </div>
                      <span className="text-bark truncate flex-1">{space.name}</span>
                      {space.slug === currentSpace.slug && (
                        <Check size={14} className="text-canopy shrink-0" />
                      )}
                    </button>
                  ))}
                  <Link
                    href="/new-space"
                    onClick={() => { setSpaceSwitcherOpen(false); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px] text-left hover:bg-paper-deep transition-colors text-bark-muted"
                  >
                    <Plus size={14} />
                    <span>Create new space</span>
                  </Link>
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

            <Link
              href="/api/auth/signout"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm min-h-[44px] text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
            >
              <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
              Sign out
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
