"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, TrendingUp, AlertTriangle, Trophy, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    documentTitle?: string;
  };
}

const typeIcons: Record<string, typeof Bell> = {
  milestone: Trophy,
  activity_spike: TrendingUp,
  negative_feedback: AlertTriangle,
  achievement: Star,
  weekly_digest: Bell,
};

const typeColors: Record<string, string> = {
  milestone: "text-amber-500",
  activity_spike: "text-blue-500",
  negative_feedback: "text-red-500",
  achievement: "text-emerald-500",
  weekly_digest: "text-gray-500",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAllRead() {
    try {
      await fetch("/api/analytics/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notificaties</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Check className="h-3 w-3" />
              Alles gelezen
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              const color = typeColors[n.type] || "text-gray-500";

              return (
                <div
                  key={n._id}
                  className={`border-b px-4 py-3 last:border-0 ${n.read ? "opacity-60" : "bg-blue-50/50"}`}
                >
                  <div className="flex gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              Geen notificaties
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
