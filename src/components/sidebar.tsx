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
  ChevronLeft,
  CircleDot,
  FileText,
  HelpCircle,
  Home,
  Lightbulb,
  ListChecks,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  TreePine,
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
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  currentSpace: SpaceInfo;
  userSpaces: UserSpace[];
}

export function Sidebar({ currentSpace, userSpaces }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);

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
          <div className="overflow-hidden">
            <span
              className="text-lg tracking-tight font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Glade
            </span>
          </div>
        )}
      </div>

      {/* Space selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border relative">
          <button
            onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
            aria-expanded={spaceSwitcherOpen}
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
            <div className="absolute left-3 right-3 top-full mt-1 bg-paper border border-border rounded-xl shadow-lg z-30 py-1">
              {userSpaces.map((space) => (
                <button
                  key={space.id}
                  onClick={async () => {
                    setSpaceSwitcherOpen(false);
                    if (space.slug !== currentSpace.slug) {
                      await switchSpace(space.slug);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-paper-warm transition-colors text-sm"
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
                <Link
                  href="/new-space"
                  onClick={() => setSpaceSwitcherOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-paper-warm transition-colors text-sm text-bark-muted"
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Create new space</span>
                </Link>
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

        {/* Sign out */}
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.8125rem] text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
        >
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          {!collapsed && <span>Sign out</span>}
        </Link>

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
