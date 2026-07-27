import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { toNumber } from "@/lib/format";
import { ledgerTotals, addPair, emptyPair, type Pair } from "@/lib/ledger";
import { PairMoney } from "@/components/money-pair";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { TruckDialog } from "./truck-dialog";
import { ToggleTruckActive } from "./toggle-active";
import { DeleteTruckButton } from "./delete-button";
import { TruckRow } from "./truck-row";

export default async function TrucksPage() {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();

  const trucks = await prisma.truck.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      transactions: {
        select: {
          moneyGiven: true,
          extraSpending: true,
          revenue: true,
          entries: {
            select: { type: true, amount: true, kind: true, currency: true },
          },
        },
      },
    },
  });

  // Live truck value = base price + money spent on the truck − profit earned.
  // Truck purchase/base prices are always stored and displayed in USD.
  function currentValueOf(tr: (typeof trucks)[number]): Pair {
    const carSpend = emptyPair();
    let profit = emptyPair();
    for (const m of tr.transactions) {
      profit = addPair(profit, ledgerTotals(m).profit);
      for (const e of m.entries)
        if (e.type === "SPENT" && e.kind === "CAR") {
          const cur: keyof Pair = e.currency === "USD" ? "USD" : "SOM";
          carSpend[cur] += toNumber(e.amount);
        }
    }
    return {
      SOM: 0,
      USD: toNumber(tr.price) + carSpend.USD - profit.USD,
    };
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.trucks.eyebrow}</p>
          <h1 className="text-3xl font-800 mt-1">{t.trucks.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {fmt(t.trucks.subtitle, { count: trucks.length })}
          </p>
        </div>
        <TruckDialog trigger={<Button>{t.trucks.add}</Button>} />
      </header>

      <div className="road-line" />

      {trucks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.trucks.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.trucks.emptyBody}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {trucks.map((tr) => (
              <div
                key={tr.id}
                className={`rounded-lg border border-border bg-card p-4 ${tr.active ? "" : "opacity-55"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-600 flex items-center gap-2">
                      <Link href={`/trucks/${tr.id}`} className="hover:underline">
                        {tr.name}
                      </Link>
                      {!tr.active && (
                        <Badge variant="outline" className="text-rust border-rust/40">
                          {t.trucks.retired}
                        </Badge>
                      )}
                    </p>
                    <p className="font-mono uppercase text-xs text-muted-foreground mt-0.5">
                      {tr.plate ?? t.common.dash}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <PairMoney
                      pair={currentValueOf(tr)}
                      className="font-mono tnum font-700"
                    />
                    <p className="eyebrow !text-[0.55rem]">
                      {t.trucks.currentValue}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-1 border-t border-border pt-2 mt-3">
                  <TruckDialog
                    truck={{
                      id: tr.id,
                      name: tr.name,
                      plate: tr.plate,
                      price: tr.price.toString(),
                    }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        {t.common.edit}
                      </Button>
                    }
                  />
                  {superadmin && <ToggleTruckActive id={tr.id} active={tr.active} />}
                  {superadmin && <DeleteTruckButton id={tr.id} name={tr.name} />}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.trucks.title}</TableHead>
                <TableHead>{t.trucks.colPlate}</TableHead>
                <TableHead className="text-right">{t.trucks.colRate}</TableHead>
                <TableHead className="text-right">
                  {t.trucks.currentValue}
                </TableHead>
                <TableHead>{t.common.added}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((tr) => (
                <TruckRow
                  key={tr.id}
                  id={tr.id}
                  name={tr.name}
                  plate={tr.plate}
                  price={Number(tr.price)}
                  currentValue={currentValueOf(tr)}
                  createdAt={tr.createdAt.toISOString()}
                  active={tr.active}
                  superadmin={superadmin}
                />
              ))}
            </TableBody>
          </Table>
          </div>
        </>
      )}
    </div>
  );
}
