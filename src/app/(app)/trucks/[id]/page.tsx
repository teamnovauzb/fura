import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { toNumber, formatDate } from "@/lib/format";
import { ledgerTotals, addPair, emptyPair, type Pair } from "@/lib/ledger";
import { PairMoney } from "@/components/money-pair";
import { getT } from "@/i18n/server";
import {
  Table,
  TableBody,
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

  // Every movement logged against this truck — shown as its own table below
  // so income/expense/profit per trip is visible directly, instead of only
  // a single blended total.
  const movements = await prisma.transaction.findMany({
    where: { truckId: id },
    orderBy: { movedAt: "desc" },
    include: {
      driver: { select: { name: true } },
      entries: { select: { type: true, amount: true, currency: true } },
    },
  });

  // Profit only counts trips that are actually finished. An open trip has
  // spent money but not yet collected revenue by design (the delivery
  // isn't done) — that's not a loss, it's just incomplete, so it shouldn't
  // be blended into "profit earned."
  const profit = movements
    .filter((m) => m.status === "ENDED")
    .reduce((acc, m) => addPair(acc, ledgerTotals(m).profit), emptyPair());

  const basePrice = toNumber(truck.price);

  return (
    <div className="space-y-6">
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

      <div className="max-w-3xl rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="eyebrow">{t.trucks.basePrice}</span>
          <PairMoney
            pair={{ SOM: 0, USD: basePrice }}
            className="font-mono tnum font-600 text-right"
          />
        </div>
        <Link
          href={`/movements?truckId=${id}`}
          className="flex items-center justify-between gap-4 px-4 py-3 bg-secondary/50 hover:bg-secondary/70 transition-colors"
        >
          <span className="eyebrow text-foreground/70">
            {t.trucks.profitEarned}
          </span>
          <PairMoney
            pair={profit}
            colored
            className="font-mono tnum font-800 text-lg text-right"
          />
        </Link>
      </div>

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
