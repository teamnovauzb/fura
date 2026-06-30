import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
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
import { DeleteMovementButton } from "./delete-button";

export default async function MovementsPage() {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();

  const movements = await prisma.transaction.findMany({
    orderBy: { movedAt: "desc" },
    include: { truck: true, driver: true, createdBy: { select: { name: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.movements.eyebrow}</p>
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
              const net =
                toNumber(m.revenue) -
                toNumber(m.moneyGiven) -
                toNumber(m.extraSpending);
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
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
                    <span className="font-mono tnum text-xs text-muted-foreground shrink-0">
                      {formatDate(m.movedAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm border-t border-border pt-3">
                    <div>
                      <p className="eyebrow !text-[0.6rem]">{t.movements.colGiven}</p>
                      <p className="font-mono tnum mt-0.5">{money(m.moneyGiven)}</p>
                    </div>
                    <div>
                      <p className="eyebrow !text-[0.6rem]">{t.movements.colSpent}</p>
                      <p className="font-mono tnum mt-0.5 text-rust">
                        {money(m.extraSpending)}
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow !text-[0.6rem]">{t.movements.colNet}</p>
                      <p
                        className={`font-mono tnum mt-0.5 ${
                          net > 0 ? "text-go" : net < 0 ? "text-rust" : ""
                        }`}
                      >
                        {m.revenue == null ? t.common.dash : money(net)}
                      </p>
                    </div>
                  </div>
                  {superadmin && (
                    <div className="flex justify-end gap-1 border-t border-border pt-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/movements/${m.id}/edit`}>
                          {t.common.edit}
                        </Link>
                      </Button>
                      <DeleteMovementButton
                        id={m.id}
                        label={`${m.destination} · ${money(m.moneyGiven)}`}
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
                <TableHead className="text-right">{t.movements.colGiven}</TableHead>
                <TableHead className="text-right">{t.movements.colSpent}</TableHead>
                <TableHead className="text-right">{t.movements.colNet}</TableHead>
                {superadmin && (
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const net =
                  toNumber(m.revenue) -
                  toNumber(m.moneyGiven) -
                  toNumber(m.extraSpending);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono tnum text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(m.movedAt)}
                    </TableCell>
                    <TableCell className="font-500 whitespace-nowrap">
                      {m.origin ? `${m.origin} → ` : ""}
                      {m.destination}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {m.truck.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {m.driver.name}
                    </TableCell>
                    <TableCell className="text-right font-mono tnum whitespace-nowrap">
                      {money(m.moneyGiven)}
                    </TableCell>
                    <TableCell className="text-right font-mono tnum text-rust whitespace-nowrap">
                      {money(m.extraSpending)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tnum whitespace-nowrap ${
                        net > 0 ? "text-go" : net < 0 ? "text-rust" : ""
                      }`}
                    >
                      {m.revenue == null ? t.common.dash : money(net)}
                    </TableCell>
                    {superadmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/movements/${m.id}/edit`}>
                              {t.common.edit}
                            </Link>
                          </Button>
                          <DeleteMovementButton
                            id={m.id}
                            label={`${m.destination} · ${money(m.moneyGiven)}`}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
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
