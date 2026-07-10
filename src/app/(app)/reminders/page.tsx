import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { formatDateOnly } from "@/lib/format";
import { todayUtc, toDateInput } from "@/lib/reminders";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReminderDialog } from "./reminder-dialog";
import {
  CompleteButton,
  ReopenButton,
  RescheduleButton,
  DeleteReminderButton,
} from "./reminder-actions";

export default async function RemindersPage() {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();
  const today = todayUtc();

  const [trucks, due, upcoming, done] = await Promise.all([
    prisma.truck.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.reminder.findMany({
      where: { status: "PENDING", dueDate: { lte: today } },
      orderBy: { dueDate: "asc" },
      include: { truck: { select: { name: true } } },
    }),
    prisma.reminder.findMany({
      where: { status: "PENDING", dueDate: { gt: today } },
      orderBy: { dueDate: "asc" },
      include: { truck: { select: { name: true } } },
    }),
    prisma.reminder.findMany({
      where: { status: "DONE" },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { truck: { select: { name: true } } },
    }),
  ]);

  type Row = (typeof due)[number];

  const total = due.length + upcoming.length;

  function Card({
    r,
    tone,
  }: {
    r: Row;
    tone: "due" | "upcoming" | "done";
  }) {
    const overdue = tone === "due" && r.dueDate.getTime() < today.getTime();
    return (
      <div
        className={`rounded-lg border bg-card p-4 ${
          tone === "due"
            ? "border-amber/50"
            : tone === "done"
              ? "border-border opacity-70"
              : "border-border"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-600 flex flex-wrap items-center gap-2">
              {r.title}
              {tone === "due" && (
                <Badge
                  variant="outline"
                  className={
                    overdue
                      ? "text-rust border-rust/40"
                      : "text-amber border-amber/40"
                  }
                >
                  {overdue ? t.reminders.overdue : t.reminders.dueToday}
                </Badge>
              )}
              {tone === "done" && (
                <Badge variant="outline" className="text-go border-go/40">
                  {t.reminders.doneBadge}
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {r.truck.name} ·{" "}
              <span className="font-mono">{formatDateOnly(r.dueDate)}</span>
            </p>
            {r.description && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
                {r.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1 border-t border-border pt-2 mt-3">
          {tone === "done" ? (
            <ReopenButton id={r.id} />
          ) : (
            <>
              <CompleteButton id={r.id} />
              <RescheduleButton id={r.id} dueDate={toDateInput(r.dueDate)} />
              <ReminderDialog
                trucks={trucks}
                reminder={{
                  id: r.id,
                  truckId: r.truckId,
                  title: r.title,
                  description: r.description,
                  dueDate: toDateInput(r.dueDate),
                }}
                trigger={
                  <Button variant="outline" size="sm">
                    {t.common.edit}
                  </Button>
                }
              />
            </>
          )}
          {superadmin && <DeleteReminderButton id={r.id} label={r.title} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.reminders.eyebrow}</p>
          <h1 className="text-3xl font-800 mt-1">{t.reminders.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {fmt(t.reminders.subtitle, { count: total })}
          </p>
        </div>
        {trucks.length > 0 && (
          <ReminderDialog
            trucks={trucks}
            trigger={<Button>{t.reminders.add}</Button>}
          />
        )}
      </header>

      <div className="road-line" />

      {trucks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.reminders.needTruckTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.reminders.needTruckBody}
          </p>
          <Button asChild className="mt-4">
            <Link href="/trucks">{t.reminders.goToTrucks}</Link>
          </Button>
        </div>
      ) : total === 0 && done.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.reminders.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.reminders.emptyBody}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {due.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-700 flex items-center gap-2">
                {t.reminders.sectionDue}
                <Badge className="bg-amber text-amber-foreground">
                  {due.length}
                </Badge>
              </h2>
              <div className="space-y-3">
                {due.map((r) => (
                  <Card key={r.id} r={r} tone="due" />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-700">{t.reminders.sectionUpcoming}</h2>
              <div className="space-y-3">
                {upcoming.map((r) => (
                  <Card key={r.id} r={r} tone="upcoming" />
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-700 text-muted-foreground">
                {t.reminders.sectionDone}
              </h2>
              <div className="space-y-3">
                {done.map((r) => (
                  <Card key={r.id} r={r} tone="done" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
