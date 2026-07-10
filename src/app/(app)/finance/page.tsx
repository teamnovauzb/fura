import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import {
  ledgerTotals,
  addPair,
  subPair,
  emptyPair,
  type Pair,
} from "@/lib/ledger";
import { PairMoney } from "@/components/money-pair";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tally = { name: string; received: Pair; spent: Pair; count: number };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireUser();
  const { t } = await getT();
  const { from, to } = await searchParams;

  const movedAt: { gte?: Date; lte?: Date } = {};
  if (from) movedAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) movedAt.lte = new Date(`${to}T23:59:59.999Z`);
  const where = from || to ? { movedAt } : {};

  const movements = await prisma.transaction.findMany({
    where,
    include: {
      truck: { select: { name: true } },
      entries: { select: { type: true, amount: true, currency: true } },
    },
  });

  const trucks = new Map<string, Tally>();
  let totalReceived = emptyPair();
  let totalSpent = emptyPair();

  for (const m of movements) {
    const { received, spent } = ledgerTotals(m);
    totalReceived = addPair(totalReceived, received);
    totalSpent = addPair(totalSpent, spent);

    const row = trucks.get(m.truckId) ?? {
      name: m.truck.name,
      received: emptyPair(),
      spent: emptyPair(),
      count: 0,
    };
    row.received = addPair(row.received, received);
    row.spent = addPair(row.spent, spent);
    row.count += 1;
    trucks.set(m.truckId, row);
  }

  const truckRows = [...trucks.values()].sort(
    (a, b) =>
      subPair(b.received, b.spent).SOM - subPair(a.received, a.spent).SOM,
  );
  const balance = subPair(totalReceived, totalSpent);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t.finance.eyebrow}</p>
        <h1 className="text-3xl font-800 mt-1">{t.finance.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.finance.subtitle}</p>
      </header>

      <div className="road-line" />

      {/* Date-range filter (native GET form) */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <Label htmlFor="from">{t.finance.filterFrom}</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="to">{t.finance.filterTo}</Label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="font-mono"
          />
        </div>
        <Button type="submit">{t.finance.apply}</Button>
        {(from || to) && (
          <Button asChild variant="ghost">
            <Link href="/finance">{t.finance.clear}</Link>
          </Button>
        )}
      </form>

      {/* Company balance — so'm and USD tracked separately */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-700">{t.finance.companyBalance}</h2>
          <p className="text-sm text-muted-foreground">
            {t.finance.companyBalanceSub}
          </p>
        </div>
        <div className="grid grid-cols-3 rounded-lg border border-border bg-card overflow-hidden divide-x divide-border">
          <div className="p-3 sm:p-4">
            <p className="eyebrow">{t.finance.companyReceived}</p>
            <PairMoney
              pair={totalReceived}
              className="mt-1.5 font-mono tnum font-700 text-go text-sm sm:text-base leading-tight"
            />
          </div>
          <div className="p-3 sm:p-4">
            <p className="eyebrow">{t.finance.companySpent}</p>
            <PairMoney
              pair={totalSpent}
              className="mt-1.5 font-mono tnum font-700 text-rust text-sm sm:text-base leading-tight"
            />
          </div>
          <div className="p-3 sm:p-4 bg-secondary/50">
            <p className="eyebrow text-foreground/70">{t.finance.colBalance}</p>
            <PairMoney
              pair={balance}
              colored
              className="mt-1.5 font-mono tnum font-800 text-base sm:text-xl leading-tight"
            />
          </div>
        </div>
      </section>

      {/* By-truck report */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-700">{t.finance.byTruckTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.finance.byTruckSub}</p>
        </div>
        {truckRows.length === 0 ? (
          <Empty t={t} />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.finance.colTruck}</TableHead>
                  <TableHead className="text-right">
                    {t.finance.colMovements}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.finance.colReceived}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.finance.colSpent}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.finance.colProfit}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {truckRows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-500 whitespace-nowrap">
                      {r.name}
                    </TableCell>
                    <TableCell className="text-right font-mono tnum whitespace-nowrap">
                      {r.count}
                    </TableCell>
                    <TableCell className="text-right font-mono tnum text-go whitespace-nowrap">
                      <PairMoney pair={r.received} className="inline-block" />
                    </TableCell>
                    <TableCell className="text-right font-mono tnum text-rust whitespace-nowrap">
                      <PairMoney pair={r.spent} className="inline-block" />
                    </TableCell>
                    <TableCell className="text-right font-mono tnum font-600 whitespace-nowrap">
                      <PairMoney
                        pair={subPair(r.received, r.spent)}
                        colored
                        className="inline-block"
                      />
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

function Empty({ t }: { t: Dictionary }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
      {t.finance.empty}
    </div>
  );
}
