import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

// Currency suffix shown across the app (so'm by default). Thousands are
// grouped with spaces: 1000000 → "1 000 000 so'm".
export const CURRENCY_SUFFIX = process.env.NEXT_PUBLIC_CURRENCY_SUFFIX ?? "so'm";
export const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-US";

/** Group an integer string with spaces every 3 digits. */
function groupThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Format a Decimal/number as money: space-grouped thousands + suffix. */
export function money(value: DecimalLike): string {
  const n = toNumber(value);
  const neg = n < 0;
  const fixed = Math.round(Math.abs(n) * 100) / 100;
  const hasFraction = fixed % 1 !== 0;
  const [int, dec] = fixed.toFixed(hasFraction ? 2 : 0).split(".");
  const grouped = groupThousands(int);
  const body = dec ? `${grouped}.${dec}` : grouped;
  return `${neg ? "−" : ""}${body} ${CURRENCY_SUFFIX}`;
}

/** Plain number from a Prisma Decimal (for arithmetic in the UI layer). */
export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
