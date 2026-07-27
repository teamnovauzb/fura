"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Banknote, Bell, ChartNoAxesCombined, LayoutDashboard, ReceiptText, ScrollText, Truck, UserRound, UsersRound } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  code: string; // mono "manifest code" shown like a dispatch board
  badge?: number; // e.g. count of due reminders — shown as a red pill
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const icons = [LayoutDashboard, ReceiptText, ChartNoAxesCombined, Truck, UserRound, Bell, UsersRound, ScrollText, Banknote];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = icons[Number(item.code)] ?? LayoutDashboard;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:translate-x-0.5",
            )}
          >
            {/* amber lane-mark indicates the active route */}
            <span
              className={cn(
                "absolute -left-3 top-2 bottom-2 w-1 rounded-r-full transition-all",
                active ? "bg-sidebar-primary" : "bg-transparent",
              )}
            />
            <Icon className={cn("size-[18px]", active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
            <span className="font-500 flex-1">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rust px-1.5 text-[0.7rem] font-700 tabular-nums text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
