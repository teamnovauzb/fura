"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Truck, UserRound, UsersRound, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/provider";
import { fmt } from "@/i18n/config";

type NotificationItem = {
  id: string;
  type: string;
  subject: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { name: string };
};

type NotificationResponse = { items: NotificationItem[]; unread: number };

export function NotificationCenter() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const newestId = useRef<string | null>(null);
  const loading = useRef(false);

  const message = useCallback((item: NotificationItem) => {
    const vars = { actor: item.actor.name, subject: item.subject };
    switch (item.type) {
      case "TRUCK_CREATED": return fmt(t.notifications.truckCreated, vars);
      case "DRIVER_CREATED": return fmt(t.notifications.driverCreated, vars);
      case "USER_CREATED": return fmt(t.notifications.userCreated, vars);
      case "MOVEMENT_CREATED": return fmt(t.notifications.movementCreated, vars);
      case "LEDGER_ENTRY_CREATED": return fmt(t.notifications.moneyAdded, vars);
      default: return fmt(t.notifications.activity, vars);
    }
  }, [t]);

  const load = useCallback(async () => {
    if (loading.current || document.visibilityState === "hidden") return;
    loading.current = true;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationResponse;
      if (newestId.current) {
        const oldIndex = data.items.findIndex((item) => item.id === newestId.current);
        const fresh = oldIndex >= 0 ? data.items.slice(0, oldIndex) : data.items;
        if (fresh.length) {
          [...fresh].reverse().forEach((item) => toast.info(message(item)));
          router.refresh();
        }
      }
      newestId.current = data.items[0]?.id ?? null;
      setItems(data.items);
      setUnread(data.unread);
    } finally {
      loading.current = false;
    }
  }, [message, router]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    const onVisible = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => !id || item.id === id ? { ...item, readAt: item.readAt ?? now } : item));
    setUnread((count) => id ? Math.max(0, count - (items.find((item) => item.id === id)?.readAt ? 0 : 1)) : 0);
  }

  const localeCode = locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US";
  const iconFor = (type: string) => {
    if (type === "TRUCK_CREATED") return Truck;
    if (type === "DRIVER_CREATED") return UserRound;
    if (type === "USER_CREATED") return UsersRound;
    return WalletCards;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t.notifications.title}
          className="fixed right-14 top-3 z-50 border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-md hover:bg-sidebar-accent md:right-6 md:top-5 md:border-border md:bg-card md:text-foreground md:hover:bg-muted"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rust px-1 text-[0.65rem] font-700 leading-5 text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(23rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-700 text-foreground">{t.notifications.title}</DropdownMenuLabel>
          {unread > 0 && (
            <button type="button" onClick={() => void markRead()} className="inline-flex items-center gap-1 text-xs font-600 text-primary hover:underline">
              <CheckCheck className="size-3.5" /> {t.notifications.markAll}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[26rem] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t.notifications.empty}</p>
          ) : items.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <DropdownMenuItem
                key={item.id}
                className={`items-start gap-3 p-2.5 ${item.readAt ? "" : "bg-primary/5"}`}
                onSelect={() => {
                  void markRead(item.id);
                  if (item.href) router.push(item.href);
                }}
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug">{message(item)}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(localeCode, { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}
                  </span>
                </span>
                {!item.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
