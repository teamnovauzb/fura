import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { money, toNumber, formatDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Button } from "@/components/ui/button";
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

  const [trucks, drivers, monthAgg, recent] = await Promise.all([
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
  ]);

  const given = toNumber(monthAgg._sum.moneyGiven);
  const spent = toNumber(monthAgg._sum.extraSpending);
  const revenue = toNumber(monthAgg._sum.revenue);

  const stats = [
    { label: t.dashboard.tripsThisMonth, value: String(monthAgg._count) },
    { label: t.dashboard.moneyGivenOut, value: money(given) },
    { label: t.dashboard.extraOnRoad, value: money(spent), tone: "rust" as const },
    { label: t.dashboard.revenueLogged, value: money(revenue), tone: "go" as const },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {t.dashboard.overview} · {formatDate(monthStart)} →
          </p>
          <h1 className="text-3xl font-800 mt-1">
            {fmt(t.dashboard.hi, {
              name: (user.name ?? "").split(" ")[0] || (user.email ?? ""),
            })}
          </h1>
        </div>
        <Button asChild>
          <Link href="/movements/new">{t.dashboard.logMovement}</Link>
        </Button>
      </header>

      <div className="road-line" />

      {/* KPI board */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card p-5"
          >
            <p className="eyebrow">{s.label}</p>
            <p
              className={`mt-3 font-mono tnum text-2xl font-700 ${
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
          className="rounded-lg border border-border bg-card p-5 hover:border-amber transition-colors"
        >
          <p className="eyebrow">{t.dashboard.activeTrucks}</p>
          <p className="mt-2 font-mono tnum text-3xl font-700">{trucks}</p>
        </Link>
        <Link
          href="/drivers"
          className="rounded-lg border border-border bg-card p-5 hover:border-amber transition-colors"
        >
          <p className="eyebrow">{t.dashboard.activeDrivers}</p>
          <p className="mt-2 font-mono tnum text-3xl font-700">{drivers}</p>
        </Link>
      </section>

      {/* Recent movements */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-700">{t.dashboard.recentMovements}</h2>
          <Link href="/movements" className="text-sm text-muted-foreground hover:text-foreground">
            {t.dashboard.viewAll}
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
          <div className="rounded-lg border border-border bg-card overflow-hidden">
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
        )}
      </section>
    </div>
  );
}
