"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { switchSpace } from "@/lib/space-actions";
import type { SpaceInfo, UserSpace } from "./app-shell";
import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "./notification-bell";
import { OPEN_SEARCH_EVENT } from "./command-palette";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  FileText,
  HelpCircle,
  Home,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Shield,
  TreePine,
  UserCircle,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home, walkthrough: "dashboard" },
  { href: "/glade", label: "The Glade", icon: CircleDot, walkthrough: undefined },
  { href: "/decisions", label: "Decisions", icon: BookOpen, walkthrough: "decisions" },
  { href: "/meetings", label: "Meetings", icon: Calendar, walkthrough: "meetings" },
  { href: "/actions", label: "Actions", icon: ListChecks, walkthrough: undefined },
  { href: "/documents", label: "Documents", icon: FileText, walkthrough: "documents" },
  { href: "/proposals", label: "Proposals", icon: MessageSquare, walkthrough: "proposals" },
  { href: "/topics", label: "Topics", icon: Lightbulb, walkthrough: undefined },
];

const BOTTOM_ITEMS = [
  { href: "/members", label: "Members", icon: Users },
  { href: "/account", label: "Account", icon: UserCircle },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  currentSpace: SpaceInfo;
  userSpaces: UserSpace[];
  isSuperAdmin?: boolean;
}

export function Sidebar({ currentSpace, userSpaces, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!spaceSwitcherOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSpaceSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [spaceSwitcherOpen]);

  // Reset focus index when dropdown opens/closes
  useEffect(() => {
    setFocusedIndex(spaceSwitcherOpen ? 0 : -1);
  }, [spaceSwitcherOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("[role='option']");
    if (items[focusedIndex]) {
      items[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const handleDropdownKeyDown = useCallback(
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
          buttonRef.current?.focus();
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
            if (space.slug !== currentSpace.slug) switchSpace(space.slug);
          } else {
            setSpaceSwitcherOpen(false);
            window.location.href = "/new-space";
          }
          break;
      }
    },
    [spaceSwitcherOpen, userSpaces, focusedIndex, currentSpace.slug]
  );

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "flex flex-col border-r border-border bg-paper-warm transition-all duration-300 ease-out",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-canopy text-paper shrink-0">
          <TreePine size={18} strokeWidth={2.5} aria-hidden="true" />
        </div>
        {!collapsed && (
          <>
            <div className="overflow-hidden flex-1">
              <span
                className="text-lg tracking-tight font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Glade
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
              aria-label="Search (Cmd+K)"
              title="Search (⌘K)"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
            >
              <Search size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <NotificationBell />
          </>
        )}
      </div>

      {/* Space selector */}
      {!collapsed && (
        <div ref={dropdownRef} className="px-3 py-3 border-b border-border relative">
          <button
            ref={buttonRef}
            onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
            onKeyDown={handleDropdownKeyDown}
            aria-expanded={spaceSwitcherOpen}
            aria-haspopup="listbox"
            aria-label="Switch space"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-paper-deep transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-md bg-canopy-pale flex items-center justify-center shrink-0">
              <span className="text-[0.625rem] font-bold text-canopy">
                {currentSpace.name[0]}
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="font-medium text-bark truncate text-[0.8125rem]">
                {currentSpace.name}
              </div>
              <div className="text-bark-muted text-xs truncate">
                {currentSpace.memberCount} member{currentSpace.memberCount !== 1 ? "s" : ""}
              </div>
            </div>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={cn(
                "text-bark-muted shrink-0 transition-transform",
                spaceSwitcherOpen && "rotate-180"
              )}
            />
          </button>

          {/* Space switcher dropdown */}
          {spaceSwitcherOpen && (
            <div role="listbox" aria-label="Spaces" className="absolute left-3 right-3 top-full mt-1 bg-paper border border-border rounded-xl shadow-lg z-30 py-1">
              {userSpaces.map((space, i) => (
                <button
                  key={space.id}
                  role="option"
                  aria-selected={space.slug === currentSpace.slug}
                  onClick={async () => {
                    setSpaceSwitcherOpen(false);
                    if (space.slug !== currentSpace.slug) {
                      await switchSpace(space.slug);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-paper-warm transition-colors text-sm",
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
              <div className="border-t border-border mt-1 pt-1">
                <div
                  role="option"
                  aria-selected={false}
                >
                  <Link
                    href="/new-space"
                    onClick={() => setSpaceSwitcherOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-paper-warm transition-colors text-sm text-bark-muted",
                      focusedIndex === userSpaces.length && "bg-paper-deep"
                    )}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>Create new space</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-walkthrough={item.walkthrough}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] transition-colors",
                isActive
                  ? "bg-canopy-pale text-canopy font-medium"
                  : "text-bark-muted hover:text-bark hover:bg-paper-deep"
              )}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="shrink-0"
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] transition-colors",
                isActive
                  ? "bg-canopy-pale text-canopy font-medium"
                  : "text-bark-muted hover:text-bark hover:bg-paper-deep"
              )}
            >
              <Icon size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin (super admins only) */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] transition-colors",
              pathname === "/admin"
                ? "bg-canopy-pale text-canopy font-medium"
                : "text-bark-muted hover:text-bark hover:bg-paper-deep"
            )}
          >
            <Shield size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}

        {/* Sign out */}
        <SignOutButton collapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors w-full"
        >
          <ChevronLeft
            size={17}
            strokeWidth={1.8}
            aria-hidden="true"
            className={cn(
              "shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
