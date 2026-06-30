"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/sidebar-nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="md:hidden border-b border-border bg-card overflow-x-auto">
      <div className="flex gap-1 px-2 py-2 min-w-max">
        {items.map((item) => {
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
                "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-600"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
