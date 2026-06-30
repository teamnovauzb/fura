import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/guards";
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
import { UserDialog } from "./user-dialog";
import { ToggleUser } from "./toggle-user";

export default async function StaffPage() {
  const me = await requireSuperadmin();
  const { t } = await getT();

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.staff.eyebrow}</p>
          <h1 className="text-3xl font-800 mt-1">{t.staff.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {fmt(t.staff.subtitle, { count: users.length })}
          </p>
        </div>
        <UserDialog trigger={<Button>{t.staff.add}</Button>} />
      </header>

      <div className="road-line" />

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => {
          const isMe = u.id === me.id;
          return (
            <div
              key={u.id}
              className={`rounded-lg border border-border bg-card p-4 ${u.active ? "" : "opacity-55"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-600 flex items-center gap-2">
                    {u.name}
                    {isMe && (
                      <Badge variant="outline" className="text-xs">
                        {t.common.you}
                      </Badge>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                    {u.email}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${
                    u.role === "SUPERADMIN"
                      ? "border-amber text-amber-foreground bg-amber/10"
                      : ""
                  }`}
                >
                  {u.role === "SUPERADMIN" ? t.roles.superadmin : t.roles.admin}
                </Badge>
              </div>
              <div className="flex justify-end border-t border-border pt-2 mt-3">
                <ToggleUser id={u.id} active={u.active} disabled={isMe} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.staff.colName}</TableHead>
              <TableHead>{t.staff.colEmail}</TableHead>
              <TableHead>{t.staff.colRole}</TableHead>
              <TableHead>{t.common.added}</TableHead>
              <TableHead className="text-right">{t.staff.colAccess}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isMe = u.id === me.id;
              return (
                <TableRow key={u.id} className={u.active ? "" : "opacity-55"}>
                  <TableCell className="font-600">
                    <span className="flex items-center gap-2">
                      {u.name}
                      {isMe && (
                        <Badge variant="outline" className="text-xs">
                          {t.common.you}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.role === "SUPERADMIN"
                          ? "border-amber text-amber-foreground bg-amber/10"
                          : ""
                      }
                    >
                      {u.role === "SUPERADMIN"
                        ? t.roles.superadmin
                        : t.roles.admin}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono tnum text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleUser id={u.id} active={u.active} disabled={isMe} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
