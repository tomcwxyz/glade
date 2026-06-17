"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateRelative } from "@/lib/utils";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notification-actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // Ignore — bell is non-critical.
    }
  }, []);

  // Poll on mount and on an interval.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh when opening so the list is current.
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpenItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationReadAction(item.id);
    }
    if (item.link) router.push(item.link);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await markAllNotificationsReadAction();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
      >
        <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-earth text-paper text-[0.5625rem] font-bold tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute left-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-paper border border-border rounded-xl shadow-lg z-40 overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-[0.8125rem] font-medium text-bark">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-bark-muted hover:text-bark transition-colors"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-bark-muted">
                No notifications yet
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleOpenItem(item)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-paper-warm transition-colors",
                    !item.read && "bg-canopy-pale/40"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!item.read && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-canopy shrink-0" aria-hidden="true" />
                    )}
                    <div className={cn("min-w-0 flex-1", item.read && "pl-3.5")}>
                      <p className="text-[0.8125rem] text-bark font-medium truncate">
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="text-xs text-bark-muted truncate">{item.body}</p>
                      )}
                      <p className="text-[0.6875rem] text-bark-muted/70 mt-0.5">
                        {formatDateRelative(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
