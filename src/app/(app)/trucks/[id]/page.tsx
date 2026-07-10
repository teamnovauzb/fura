import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { fmtMoney, toNumber, formatDate } from "@/lib/format";
import { ledgerTotals, addPair, emptyPair, type Pair } from "@/lib/ledger";
import { PairMoney } from "@/components/money-pair";
import { getT } from "@/i18n/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { t } = await getT();
  const { id } = await params;

  const truck = await prisma.truck.findUnique({ where: { id } });
  if (!truck) notFound();

  // Every "car" expense logged on any of this truck's movements.
  const carEntries = await prisma.ledgerEntry.findMany({
    where: { kind: "CAR", transaction: { truckId: id } },
    include: {
      transaction: {
        select: { id: true, origin: true, destination: true, movedAt: true },
      },
      handledBy: { select: { name: true } },
    },
    orderBy: { at: "desc" },
  });

  // Profit earned across all of this truck's movements — it pays the truck
  // down over the year.
  const movements = await prisma.transaction.findMany({
    where: { truckId: id },
    select: {
      moneyGiven: true,
      extraSpending: true,
      revenue: true,
      entries: { select: { type: true, amount: true, currency: true } },
    },
  });
  const profit = movements.reduce(
    (acc, m) => addPair(acc, ledgerTotals(m).profit),
    emptyPair(),
  );

  const basePrice = toNumber(truck.price);
  const carSpend = carEntries.reduce((acc, e) => {
    const cur: keyof Pair = e.currency === "USD" ? "USD" : "SOM";
    acc[cur] += toNumber(e.amount);
    return acc;
  }, emptyPair());
  // Truck value = starting price (so'm) + money spent on the truck − profit
  // earned. Goal: reach zero (or go negative) by year end.
  const currentValue: Pair = {
    SOM: basePrice + carSpend.SOM - profit.SOM,
    USD: carSpend.USD - profit.USD,
  };

  const rows: { label: string; pair: Pair; sign: string }[] = [
    { label: t.trucks.basePrice, pair: { SOM: basePrice, USD: 0 }, sign: "" },
    { label: t.trucks.carSpend, pair: carSpend, sign: "+" },
    { label: t.trucks.profitEarned, pair: profit, sign: "−" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="eyebrow">
          <Link href="/trucks" className="hover:text-foreground">
            {t.nav.trucks}
          </Link>{" "}
          / {truck.name}
        </p>
        <h1 className="text-3xl font-800 mt-1">{truck.name}</h1>
        <p className="font-mono uppercase text-sm text-muted-foreground mt-1">
          {truck.plate ?? t.common.dash}
        </p>
      </header>

      <div className="road-line" />

      {/* Base price + truck spending − profit earned = current value */}
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-4 px-4 py-2.5"
          >
            <span className="eyebrow">{r.label}</span>
            <div className="flex items-start gap-1 font-mono tnum font-600">
              {r.sign && <span className="text-muted-foreground">{r.sign}</span>}
              <PairMoney pair={r.pair} className="text-right" />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-secondary/50">
          <span className="eyebrow text-foreground/70">
            {t.trucks.currentValue}
          </span>
          <PairMoney
            pair={currentValue}
            className="font-mono tnum font-800 text-lg text-right"
          />
        </div>
      </div>

      {/* Where the money went on this car */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-700">{t.trucks.carExpenses}</h2>
          <p className="text-sm text-muted-foreground">
            {t.trucks.carExpensesSub}
          </p>
        </div>
        {carEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t.trucks.noCarSpend}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.trucks.carWhat}</TableHead>
                  <TableHead>{t.trucks.carMovement}</TableHead>
                  <TableHead className="text-right">{t.trucks.carAmount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono tnum text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(e.at)}
                    </TableCell>
                    <TableCell className="font-500">
                      {e.label ?? t.movements.entryUnlabeled}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/movements/${e.transaction.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {e.transaction.origin
                          ? `${e.transaction.origin} → `
                          : ""}
                        {e.transaction.destination}
                        <ArrowUpRight size={13} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tnum text-rust whitespace-nowrap">
                      {fmtMoney(toNumber(e.amount), e.currency)}
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
