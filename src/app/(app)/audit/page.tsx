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

  const transactionIds = new Set<string>();
  for (const entry of entries) {
    const snapshot = auditSnapshot(entry.before, entry.after);
    if (entry.entity === "Transaction" && entry.entityId)
      transactionIds.add(entry.entityId);
    if (typeof snapshot.transactionId === "string")
      transactionIds.add(snapshot.transactionId);
  }

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: [...transactionIds] } },
    select: { id: true, truckId: true },
  });
  const truckIdByTransaction = new Map(
    transactions.map((transaction) => [transaction.id, transaction.truckId]),
  );

  // Audit snapshots also let deleted movements keep their truck association.
  for (const entry of entries) {
    if (entry.entity !== "Transaction" || !entry.entityId) continue;
    const snapshot = auditSnapshot(entry.before, entry.after);
    if (typeof snapshot.truckId === "string")
      truckIdByTransaction.set(entry.entityId, snapshot.truckId);
  }

  const truckIds = new Set(truckIdByTransaction.values());
  for (const entry of entries) {
    const snapshot = auditSnapshot(entry.before, entry.after);
    if (entry.entity === "Truck" && entry.entityId) truckIds.add(entry.entityId);
    if (typeof snapshot.truckId === "string") truckIds.add(snapshot.truckId);
  }

  const trucks = await prisma.truck.findMany({
    where: { id: { in: [...truckIds] } },
    select: { id: true, name: true, plate: true },
  });
  const truckLabelById = new Map(
    trucks.map((truck) => [truck.id, truckLabel(truck.name, truck.plate)]),
  );

  // Preserve the label for trucks that have since been deleted.
  for (const entry of entries) {
    if (entry.entity !== "Truck" || !entry.entityId) continue;
    const snapshot = auditSnapshot(entry.before, entry.after);
    if (typeof snapshot.name === "string") {
      truckLabelById.set(
        entry.entityId,
        truckLabel(
          snapshot.name,
          typeof snapshot.plate === "string" ? snapshot.plate : null,
        ),
      );
    }
  }

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
                <TableHead>{t.audit.colTruck}</TableHead>
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
                  <TableCell className="text-xs whitespace-nowrap">
                    {truckForAuditEntry(e, truckIdByTransaction, truckLabelById)}
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

function auditSnapshot(before: unknown, after: unknown): Record<string, unknown> {
  return ((after ?? before ?? {}) as Record<string, unknown>);
}

function truckLabel(name: string, plate: string | null): string {
  if (!plate) return name;
  const number = plate.replace(/\s/g, "").match(/^\d{2}\D*(\d{3})/)?.[1] ?? plate;
  return `${name} / ${number}`;
}

function truckForAuditEntry(
  entry: { entity: string; entityId: string | null; before: unknown; after: unknown },
  truckIdByTransaction: Map<string, string>,
  truckLabelById: Map<string, string>,
): string {
  const snapshot = auditSnapshot(entry.before, entry.after);
  let truckId: string | undefined;

  if (entry.entity === "Truck") truckId = entry.entityId ?? undefined;
  else if (typeof snapshot.truckId === "string") truckId = snapshot.truckId;
  else if (entry.entity === "Transaction" && entry.entityId)
    truckId = truckIdByTransaction.get(entry.entityId);
  else if (typeof snapshot.transactionId === "string")
    truckId = truckIdByTransaction.get(snapshot.transactionId);

  return (truckId && truckLabelById.get(truckId)) || "—";
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
