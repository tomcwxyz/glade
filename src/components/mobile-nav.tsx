"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  Home,
  ListChecks,
  Menu,
  Settings,
  TreePine,
  Users,
  X,
  CircleDot,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/glade", label: "The Glade", icon: CircleDot },
  { href: "/decisions", label: "Decisions", icon: BookOpen },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/members", label: "Members", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ spaceName }: { spaceName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
            {spaceName}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 text-bark-muted hover:text-bark transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Dropdown nav */}
      {open && (
        <nav className="px-3 py-2 border-b border-border bg-paper-warm space-y-0.5">
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
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-canopy-pale text-canopy font-medium"
                    : "text-bark-muted hover:text-bark hover:bg-paper-deep"
                )}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
