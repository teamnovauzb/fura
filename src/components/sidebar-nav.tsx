"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  code: string; // mono "manifest code" shown like a dispatch board
  badge?: number; // e.g. count of due reminders — shown as a red pill
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-md pl-4 pr-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {/* amber lane-mark indicates the active route */}
            <span
              className={cn(
                "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-all",
                active ? "lane-mark" : "bg-transparent group-hover:bg-sidebar-border",
              )}
            />
            <span className="font-mono text-[0.65rem] tabular-nums text-sidebar-foreground/40 w-7">
              {item.code}
            </span>
            <span className="font-500">{item.label}</span>
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
