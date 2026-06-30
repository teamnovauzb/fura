"use client";

import { cn } from "@/lib/utils";
import { locales, localeNames } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LanguageSwitcher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md p-0.5",
        variant === "dark" ? "bg-sidebar-accent/50" : "bg-secondary",
        className,
      )}
    >
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            disabled={active}
            onClick={() => setLocale(l)}
            className={cn(
              "rounded px-2 py-1 text-xs font-600 font-mono uppercase tracking-wider transition-colors disabled:cursor-default",
              active
                ? "lane-mark text-[oklch(0.22_0.012_265)]"
                : variant === "dark"
                  ? "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={active}
          >
            {localeNames[l]}
          </button>
        );
      })}
    </div>
  );
}
