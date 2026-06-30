import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { formatDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DriverDialog } from "./driver-dialog";
import { ToggleDriverActive } from "./toggle-active";

export default async function DriversPage() {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();

  const drivers = await prisma.driver.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { transactions: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.drivers.eyebrow}</p>
          <h1 className="text-3xl font-800 mt-1">{t.drivers.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {fmt(t.drivers.subtitle, { count: drivers.length })}
          </p>
        </div>
        <DriverDialog trigger={<Button>{t.drivers.add}</Button>} />
      </header>

      <div className="road-line" />

      {drivers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.drivers.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.drivers.emptyBody}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.drivers.title}</TableHead>
                <TableHead>{t.drivers.colPhone}</TableHead>
                <TableHead className="text-right">{t.drivers.colTrips}</TableHead>
                <TableHead>{t.common.added}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id} className={d.active ? "" : "opacity-55"}>
                  <TableCell className="font-600">
                    <span className="flex items-center gap-2">
                      {d.name}
                      {!d.active && (
                        <Badge variant="outline" className="text-rust border-rust/40">
                          {t.drivers.inactive}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {d.phone ?? t.common.dash}
                  </TableCell>
                  <TableCell className="text-right font-mono tnum">
                    {d._count.transactions}
                  </TableCell>
                  <TableCell className="font-mono tnum text-xs text-muted-foreground">
                    {formatDate(d.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DriverDialog
                        driver={{ id: d.id, name: d.name, phone: d.phone }}
                        trigger={
                          <Button variant="ghost" size="sm">
                            {t.common.edit}
                          </Button>
                        }
                      />
                      {superadmin && (
                        <ToggleDriverActive id={d.id} active={d.active} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
