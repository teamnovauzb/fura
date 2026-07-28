import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { formatDate } from "@/lib/format";
import { ledgerTotals } from "@/lib/ledger";
import { PairMoney } from "@/components/money-pair";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovementRow } from "./movement-row";
import { DeleteMovementButton } from "./delete-button";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ truckId?: string }>;
}) {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();
  const { truckId } = await searchParams;

  const filterTruck = truckId
    ? await prisma.truck.findUnique({ where: { id: truckId } })
    : null;

  const movements = await prisma.transaction.findMany({
    where: filterTruck ? { truckId: filterTruck.id } : undefined,
    orderBy: { movedAt: "desc" },
    include: {
      truck: true,
      driver: true,
      entries: { select: { type: true, amount: true, currency: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {filterTruck ? (
              <>
                <Link href="/trucks" className="hover:text-foreground">
                  {t.nav.trucks}
                </Link>{" "}
                /{" "}
                <Link
                  href={`/trucks/${filterTruck.id}`}
                  className="hover:text-foreground"
                >
                  {filterTruck.name}
                </Link>
              </>
            ) : (
              t.movements.eyebrow
            )}
          </p>
          <h1 className="text-3xl font-800 mt-1">{t.movements.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {movements.length === 200
              ? t.movements.subtitleLatest
              : fmt(t.movements.subtitleCount, { count: movements.length })}
            {!superadmin && t.movements.onlyOwnerEdits}
          </p>
        </div>
        <Button asChild>
          <Link href="/movements/new">{t.movements.log}</Link>
        </Button>
      </header>

      <div className="road-line" />

      {movements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.movements.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.movements.emptyBody}
          </p>
          <Button asChild className="mt-4">
            <Link href="/movements/new">{t.movements.log}</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {movements.map((m) => {
              const { received, spent, profit } = ledgerTotals(m);
              const ended = m.status === "ENDED";
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-card"
                >
                <Link
                  href={`/movements/${m.id}`}
                  className="block p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-600 truncate">
                        {m.origin ? `${m.origin} → ` : ""}
                        {m.destination}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.truck.name} · {m.driver.name}
                      </p>
                    </div>
                    <Badge variant={ended ? "secondary" : "default"}>
                      {ended ? t.movements.statusEnded : t.movements.statusOpen}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm border-t border-border pt-3">
                    <div>
                      <p className="eyebrow !text-[0.6rem]">
                        {t.movements.received}
                      </p>
                      <PairMoney
                        pair={received}
                        className="font-mono tnum mt-0.5 text-go"
                      />
                    </div>
                    <div>
                      <p className="eyebrow !text-[0.6rem]">
                        {t.movements.spent}
                      </p>
                      <PairMoney
                        pair={spent}
                        className="font-mono tnum mt-0.5 text-rust"
                      />
                    </div>
                    <div>
                      <p className="eyebrow !text-[0.6rem]">
                        {t.movements.profit}
                      </p>
                      <PairMoney
                        pair={profit}
                        colored
                        className="font-mono tnum mt-0.5"
                      />
                    </div>
                  </div>
                </Link>
                {superadmin && (
                  <div className="flex justify-end border-t border-border px-4 py-2">
                    <DeleteMovementButton
                      id={m.id}
                      label={`${m.origin ? `${m.origin} → ` : ""}${m.destination}`}
                    />
                  </div>
                )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.movements.colRoute}</TableHead>
                  <TableHead>{t.movements.colTruck}</TableHead>
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
                  const { received, spent, profit } = ledgerTotals(m);
                  return (
                    <MovementRow
                      key={m.id}
                      id={m.id}
                      dateStr={formatDate(m.movedAt)}
                      route={`${m.origin ? `${m.origin} → ` : ""}${m.destination}`}
                      truck={m.truck.name}
                      driver={m.driver.name}
                      received={received}
                      spent={spent}
                      profit={profit}
                      ended={m.status === "ENDED"}
                      superadmin={superadmin}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
