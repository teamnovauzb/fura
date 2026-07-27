import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { money, toNumber, formatDate, formatDateOnly } from "@/lib/format";
import { todayUtc } from "@/lib/reminders";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BanknoteArrowDown, CircleDollarSign, Plus, Route, Truck, UsersRound, WalletCards } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { t } = await getT();
  const monthStart = startOfMonth();

  const [trucks, drivers, monthAgg, recent, dueReminders] = await Promise.all([
    prisma.truck.count({ where: { active: true } }),
    prisma.driver.count({ where: { active: true } }),
    prisma.transaction.aggregate({
      where: { movedAt: { gte: monthStart } },
      _sum: { moneyGiven: true, extraSpending: true, revenue: true },
      _count: true,
    }),
    prisma.transaction.findMany({
      take: 8,
      orderBy: { movedAt: "desc" },
      include: { truck: true, driver: true },
    }),
    prisma.reminder.findMany({
      where: { status: "PENDING", dueDate: { lte: todayUtc() } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { truck: { select: { name: true } } },
    }),
  ]);

  const given = toNumber(monthAgg._sum.moneyGiven);
  const spent = toNumber(monthAgg._sum.extraSpending);
  const revenue = toNumber(monthAgg._sum.revenue);

  const stats = [
    { label: t.dashboard.tripsThisMonth, value: String(monthAgg._count), icon: Route },
    { label: t.dashboard.moneyGivenOut, value: money(given), icon: WalletCards },
    { label: t.dashboard.extraOnRoad, value: money(spent), tone: "rust" as const, icon: BanknoteArrowDown },
    { label: t.dashboard.revenueLogged, value: money(revenue), tone: "go" as const, icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {t.dashboard.overview} · {formatDate(monthStart)} →
          </p>
          <h1 className="page-title">
            {fmt(t.dashboard.hi, {
              name: (user.name ?? "").split(" ")[0] || (user.email ?? ""),
            })}
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/movements/new"><Plus className="size-4" />{t.dashboard.logMovement}</Link>
        </Button>
      </header>

      {/* Due reminders — every staff member sees these until handled */}
      {dueReminders.length > 0 && (
        <section className="surface border-amber/30 bg-amber/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow flex items-center gap-2 text-amber">
              {t.reminders.bannerTitle}
              <Badge className="bg-amber text-amber-foreground">
                {dueReminders.length}
              </Badge>
            </p>
            <Link
              href="/reminders"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t.reminders.bannerLink}
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {dueReminders.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-500">
                  {r.title}
                  <span className="text-muted-foreground font-400">
                    {" "}
                    · {r.truck.name}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDateOnly(r.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* KPI board */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="surface relative overflow-hidden p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">{s.label}</p>
              <span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><s.icon className="size-[18px]" /></span>
            </div>
            <p
              className={`mt-5 font-mono tnum text-2xl font-700 break-words leading-tight tracking-tight ${
                s.tone === "rust"
                  ? "text-rust"
                  : s.tone === "go"
                    ? "text-go"
                    : "text-foreground"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </section>

      {/* Fleet snapshot */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/trucks"
          className="surface group p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
        >
          <div className="flex items-start justify-between"><div><p className="eyebrow">{t.dashboard.activeTrucks}</p><p className="mt-3 font-mono tnum text-3xl font-700">{trucks}</p></div><span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary"><Truck className="size-5" /></span></div>
        </Link>
        <Link
          href="/drivers"
          className="surface group p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
        >
          <div className="flex items-start justify-between"><div><p className="eyebrow">{t.dashboard.activeDrivers}</p><p className="mt-3 font-mono tnum text-3xl font-700">{drivers}</p></div><span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary"><UsersRound className="size-5" /></span></div>
        </Link>
      </section>

      {/* Recent movements */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-700">{t.dashboard.recentMovements}</h2>
          <Link href="/movements" className="inline-flex items-center gap-1.5 text-sm font-600 text-primary hover:text-primary/80">
            {t.dashboard.viewAll}<ArrowRight className="size-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="font-600">{t.dashboard.emptyTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t.dashboard.emptyBody}
            </p>
            <Button asChild className="mt-4">
              <Link href="/movements/new">{t.dashboard.logMovement}</Link>
            </Button>
          </div>
        ) : (
          <>
          {/* Mobile: compact rows */}
          <div className="space-y-2 md:hidden">
            {recent.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-500 text-sm truncate">
                    {m.origin ? `${m.origin} → ` : ""}
                    {m.destination}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.truck.name} · {formatDate(m.movedAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono tnum text-sm">{money(m.moneyGiven)}</p>
                  <p className="font-mono tnum text-xs text-rust">
                    {money(m.extraSpending)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block surface overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.dashboard.route}</TableHead>
                  <TableHead>{t.dashboard.truck}</TableHead>
                  <TableHead>{t.dashboard.driver}</TableHead>
                  <TableHead className="text-right">{t.dashboard.given}</TableHead>
                  <TableHead className="text-right">{t.dashboard.spent}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono tnum text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(m.movedAt)}
                    </TableCell>
                    <TableCell className="font-500">
                      {m.origin ? `${m.origin} → ` : ""}
                      {m.destination}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.truck.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.driver.name}</TableCell>
                    <TableCell className="text-right font-mono tnum">
                      {money(m.moneyGiven)}
                    </TableCell>
                    <TableCell className="text-right font-mono tnum text-rust">
                      {money(m.extraSpending)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
