import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, Droplets, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsApi } from "@/api/notifications";
import type { BackendNotification } from "@/api/types";
import { useAuth } from "@/lib/auth-context";

function formatTimeAgo(isoString?: string) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 45) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data || []);
    } catch {
      // Graceful fallback if backend is unreachable
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

  const handleMarkAsRead = async (id: number, plantId?: number | null) => {
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
    );

    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Revert or re-fetch on error
      fetchNotifications();
    }

    if (plantId) {
      setIsOpen(false);
      navigate({ to: `/plant/${plantId}` });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => n.status === "UNREAD");
    if (unread.length === 0) return;

    // Optimistically mark all read
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));

    try {
      await Promise.all(unread.map((n) => notificationsApi.markAsRead(n.id)));
    } catch {
      fetchNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View notifications"
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-warm px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 rounded-2xl border border-border bg-card p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-amber-warm/15 px-2 py-0.5 text-[11px] font-semibold text-amber-warm">
                {unreadCount} unread
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                All read
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-84 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                All plants looking good
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No alerts right now. Low-soil-moisture notices will show up here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = item.status === "UNREAD";
              const isLowMoisture = item.type === "LOW_MOISTURE";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMarkAsRead(item.id, item.plant?.id)}
                  className={`w-full flex items-start gap-3 p-3.5 text-left transition-colors duration-150 ${
                    isUnread
                      ? "bg-amber-warm/[0.07] hover:bg-amber-warm/[0.13]"
                      : "hover:bg-muted/50 opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isLowMoisture
                        ? isUnread
                          ? "bg-amber-warm/20 text-amber-warm"
                          : "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    <Droplets className="h-4 w-4" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {item.plant?.name || "Care Alert"}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between">
                      {isUnread ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-warm">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-warm" />
                          Unread • Click to mark read
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Read
                        </span>
                      )}
                      {item.plant?.id && (
                        <span className="text-[10px] font-medium text-primary hover:underline">
                          View Plant →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
