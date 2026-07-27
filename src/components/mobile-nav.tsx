"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/sidebar-nav";
import { Banknote, Bell, ChartNoAxesCombined, LayoutDashboard, ReceiptText, ScrollText, Truck, UserRound, UsersRound } from "lucide-react";

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const icons = [LayoutDashboard, ReceiptText, ChartNoAxesCombined, Truck, UserRound, Bell, UsersRound, ScrollText, Banknote];

  return (
    <div className="md:hidden sticky top-16 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl overflow-x-auto scrollbar-none">
      <div className="flex gap-1.5 px-4 py-2.5 min-w-max">
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 text-sm rounded-full whitespace-nowrap transition-all",
                active
                  ? "bg-primary text-primary-foreground font-600 shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {item.badge ? (
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-rust px-1 text-[0.65rem] font-700 tabular-nums text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
