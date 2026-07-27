import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Banknote, Landmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { fmtMoney, formatDate, toNumber } from "@/lib/format";
import { getT } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SomKassaRow } from "./som-kassa-row";

export default async function SomKassaPage() {
  await requireUser();
  const { t } = await getT();

  const entries = await prisma.ledgerEntry.findMany({
    where: { currency: "SOM" },
    orderBy: [{ at: "desc" }, { createdAt: "desc" }],
    include: {
      handledBy: { select: { name: true } },
      transaction: {
        select: {
          id: true,
          origin: true,
          destination: true,
          truck: { select: { name: true } },
        },
      },
    },
  });

  const received = entries.reduce(
    (sum, entry) => entry.type === "RECEIVED" ? sum + toNumber(entry.amount) : sum,
    0,
  );
  const spent = entries.reduce(
    (sum, entry) => entry.type === "SPENT" ? sum + toNumber(entry.amount) : sum,
    0,
  );
  const balance = received - spent;
  const routeOf = (entry: (typeof entries)[number]) =>
    `${entry.transaction.origin ? `${entry.transaction.origin} → ` : ""}${entry.transaction.destination}`;

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{t.somKassa.eyebrow}</p>
        <h1 className="page-title">{t.somKassa.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.somKassa.subtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <div className="flex items-center justify-between"><p className="eyebrow">{t.somKassa.received}</p><span className="grid size-10 place-items-center rounded-xl bg-go/10 text-go"><ArrowDownLeft className="size-5" /></span></div>
          <p className="mt-4 font-mono tnum text-2xl font-700 text-go">{fmtMoney(received, "SOM")}</p>
        </div>
        <div className="surface p-5">
          <div className="flex items-center justify-between"><p className="eyebrow">{t.somKassa.spent}</p><span className="grid size-10 place-items-center rounded-xl bg-rust/10 text-rust"><ArrowUpRight className="size-5" /></span></div>
          <p className="mt-4 font-mono tnum text-2xl font-700 text-rust">{fmtMoney(spent, "SOM")}</p>
        </div>
        <div className="surface border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between"><p className="eyebrow">{t.somKassa.balance}</p><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Landmark className="size-5" /></span></div>
          <p className={`mt-4 font-mono tnum text-2xl font-800 ${balance < 0 ? "text-rust" : "text-foreground"}`}>{fmtMoney(balance, "SOM")}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-700">{t.somKassa.history}</h2>
          <Badge variant="secondary">{entries.length}</Badge>
        </div>

        {entries.length === 0 ? (
          <div className="surface border-dashed p-10 text-center">
            <Banknote className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-600">{t.somKassa.empty}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {entries.map((entry) => {
                const income = entry.type === "RECEIVED";
                return (
                  <Link key={entry.id} href={`/movements/${entry.transaction.id}`} className="surface flex items-center gap-3 p-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${income ? "bg-go/10 text-go" : "bg-rust/10 text-rust"}`}>{income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-600">{entry.label ?? routeOf(entry)}</span><span className="block truncate text-xs text-muted-foreground">{entry.transaction.truck.name} · {formatDate(entry.at)}</span></span>
                    <span className={`font-mono tnum text-sm font-700 ${income ? "text-go" : "text-rust"}`}>{income ? "+" : "−"}{fmtMoney(entry.amount, "SOM")}</span>
                  </Link>
                );
              })}
            </div>

            <div className="surface hidden overflow-hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>{t.common.date}</TableHead><TableHead>{t.somKassa.description}</TableHead><TableHead>{t.somKassa.movement}</TableHead><TableHead>{t.dashboard.truck}</TableHead><TableHead>{t.somKassa.staff}</TableHead><TableHead className="text-right">{t.somKassa.amount}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <SomKassaRow
                      key={entry.id}
                      movementId={entry.transaction.id}
                      at={entry.at.toISOString()}
                      label={entry.label}
                      kind={entry.kind}
                      route={routeOf(entry)}
                      truck={entry.transaction.truck.name}
                      staff={entry.handledBy.name}
                      type={entry.type}
                      amount={toNumber(entry.amount)}
                    />
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
