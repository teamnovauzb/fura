import { prisma } from "@/lib/prisma";

/**
 * Reminders use date-only (`@db.Date`) values, which Prisma reads/writes as
 * JS Dates at UTC midnight. To compare against "today" without timezone drift
 * we build all boundaries in UTC too.
 */

/** Today at 00:00 UTC — the cutoff a reminder is "due" on or before. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Parse a yyyy-mm-dd string into a UTC-midnight Date for storage. */
export function parseDueDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** A stored due date back to yyyy-mm-dd for prefilling a date input. */
export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A reminder is due when it's still PENDING and its day is today or past. */
export function dueWhere() {
  return { status: "PENDING" as const, dueDate: { lte: todayUtc() } };
}

/** How many reminders are currently due — drives the nav badge. */
export function countDueReminders(): Promise<number> {
  return prisma.reminder.count({ where: dueWhere() });
}
