import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
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
import { MovementRow } from "../../movements/movement-row";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
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

  // Every movement logged against this truck — shown as its own table below
  // so income/expense/profit per trip is visible directly, instead of only
  // a single blended total that mixes finished trips with ones still open.
  const movements = await prisma.transaction.findMany({
    where: { truckId: id },
    orderBy: { movedAt: "desc" },
    include: {
      driver: { select: { name: true } },
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
  // Truck value = starting price (USD) + money spent on the truck − profit
  // earned. Goal: reach zero (or go negative) by year end.
  const currentValue: Pair = {
    SOM: 0,
    USD: basePrice + carSpend.USD - profit.USD,
  };

  // Profit is subtracted from the running total, but when it's negative
  // (the truck operated at a loss) that becomes a double negative on
  // screen ("− -3,291"). Flip sign+magnitude so a loss reads as "+" back
  // onto the value instead, matching what the math actually does.
  const profitRow =
    profit.USD >= 0
      ? { label: t.trucks.profitEarned, pair: { SOM: 0, USD: profit.USD }, sign: "−" }
      : { label: t.trucks.profitEarned, pair: { SOM: 0, USD: -profit.USD }, sign: "+" };

  const rows: { label: string; pair: Pair; sign: string }[] = [
    { label: t.trucks.basePrice, pair: { SOM: 0, USD: basePrice }, sign: "" },
    { label: t.trucks.carSpend, pair: { SOM: 0, USD: carSpend.USD }, sign: "+" },
    profitRow,
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

      {/* Base price + truck spending − profit earned = current value.
          Profit/current value are both derived from this truck's
          movements, so clicking them jumps to the filtered movement log
          instead of leaving people wondering where a number came from. */}
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {rows.map((r) => {
          const clickable = r.label === t.trucks.profitEarned;
          const rowContent = (
            <>
              <span className="eyebrow">{r.label}</span>
              <div className="flex items-start gap-1 font-mono tnum font-600">
                {r.sign && <span className="text-muted-foreground">{r.sign}</span>}
                <PairMoney pair={r.pair} className="text-right" />
              </div>
            </>
          );
          return clickable ? (
            <Link
              key={r.label}
              href={`/movements?truckId=${id}`}
              className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
            >
              {rowContent}
            </Link>
          ) : (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              {rowContent}
            </div>
          );
        })}
        <Link
          href={`/movements?truckId=${id}`}
          className="flex items-center justify-between gap-4 px-4 py-3 bg-secondary/50 hover:bg-secondary/70 transition-colors"
        >
          <span className="eyebrow text-foreground/70">
            {t.trucks.currentValue}
          </span>
          <PairMoney
            pair={currentValue}
            className="font-mono tnum font-800 text-lg text-right"
          />
        </Link>
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

      {/* Every movement for this truck, broken into income/expense/profit
          per trip — so the totals above are traceable instead of opaque,
          and it's obvious at a glance which trips are finished vs still
          open (open trips show spend with nothing received yet, which is
          expected, not a loss). */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-700">{t.movements.title}</h2>
        </div>
        {movements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t.movements.emptyBody}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.movements.colRoute}</TableHead>
                  <TableHead>{t.movements.colDriver}</TableHead>
                  <TableHead className="text-right">
                    {t.movements.received}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.movements.spent}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.movements.profit}
                  </TableHead>
                  <TableHead>{t.movements.colStatus}</TableHead>
                  {superadmin && (
                    <TableHead className="text-right">
                      {t.common.actions}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const { received, spent, profit: mProfit } = ledgerTotals(m);
                  return (
                    <MovementRow
                      key={m.id}
                      id={m.id}
                      dateStr={formatDate(m.movedAt)}
                      route={`${m.origin ? `${m.origin} → ` : ""}${m.destination}`}
                      truck={truck.name}
                      driver={m.driver.name}
                      received={received}
                      spent={spent}
                      profit={mProfit}
                      ended={m.status === "ENDED"}
                      superadmin={superadmin}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
