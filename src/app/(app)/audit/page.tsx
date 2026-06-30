import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const actionTone: Record<string, string> = {
  CREATE: "text-go border-go/40 bg-go/10",
  UPDATE: "text-amber-foreground border-amber/40 bg-amber/10",
  DELETE: "text-rust border-rust/40 bg-rust/10",
  LOGIN: "text-muted-foreground",
};

export default async function AuditPage() {
  await requireSuperadmin();
  const { t } = await getT();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t.audit.eyebrow}</p>
        <h1 className="text-3xl font-800 mt-1">{t.audit.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.audit.subtitle}</p>
      </header>

      <div className="road-line" />

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="font-600">{t.audit.emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.audit.emptyBody}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.audit.colWhen}</TableHead>
                <TableHead>{t.audit.colWho}</TableHead>
                <TableHead>{t.audit.colAction}</TableHead>
                <TableHead>{t.audit.colEntity}</TableHead>
                <TableHead>{t.audit.colChange}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="align-top">
                  <TableCell className="font-mono tnum text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(e.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-500">{e.user.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[0.65rem] ${actionTone[e.action] ?? ""}`}
                    >
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.entity}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <AuditDiff before={e.before} after={e.after} />
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

const HIDDEN = new Set(["id", "createdAt", "updatedAt", "createdById"]);

function AuditDiff({ before, after }: { before: unknown; after: unknown }) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (k) => !HIDDEN.has(k),
  );

  // CREATE → show the new values; DELETE → the old; UPDATE → only what changed.
  const changed = keys.filter((k) => fmt(b[k]) !== fmt(a[k]));
  const rows = before && after ? changed : keys;

  if (rows.length === 0)
    return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <ul className="space-y-0.5 text-xs font-mono">
      {rows.slice(0, 6).map((k) => (
        <li key={k} className="flex gap-1.5">
          <span className="text-muted-foreground">{k}:</span>
          {before && after ? (
            <span>
              <span className="text-rust line-through">{fmt(b[k])}</span>{" "}
              <span className="text-go">{fmt(a[k])}</span>
            </span>
          ) : (
            <span className="text-foreground">{fmt((after ?? before ? a[k] ?? b[k] : "") )}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
