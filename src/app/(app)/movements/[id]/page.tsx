import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, User, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, isSuperadmin } from "@/lib/guards";
import { toNumber, formatDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteMovementButton } from "../delete-button";
import { LedgerPanel, type TripView } from "./ledger-panel";

export default async function MovementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();
  const { id } = await params;

  const movement = await prisma.transaction.findUnique({
    where: { id },
    include: {
      truck: { select: { name: true } },
      driver: { select: { name: true } },
      trips: {
        orderBy: { order: "asc" },
        include: {
          entries: {
            orderBy: [{ at: "asc" }, { createdAt: "asc" }],
            include: { handledBy: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!movement) notFound();

  const trips: TripView[] = movement.trips.map((tp) => ({
    id: tp.id,
    order: tp.order,
    origin: tp.origin,
    destination: tp.destination,
    entries: tp.entries.map((e) => ({
      id: e.id,
      type: e.type,
      kind: e.kind,
      currency: e.currency,
      amount: toNumber(e.amount),
      label: e.label,
      imageName: e.imageName,
      hasImage: Boolean(e.imagePath),
      at: e.at.toISOString().slice(0, 10),
      handledBy: e.handledBy.name,
    })),
  }));

  // Header route spans the whole journey: first origin → last destination.
  const firstOrigin = trips[0]?.origin ?? movement.origin;
  const lastDest =
    trips[trips.length - 1]?.destination ?? movement.destination;

  const today = new Date().toISOString().slice(0, 10);
  const ended = movement.status === "ENDED";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <p className="eyebrow">
          <Link href="/movements" className="hover:text-foreground">
            {t.nav.movements}
          </Link>{" "}
          / {lastDest}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-3xl font-800">
            {firstOrigin ? `${firstOrigin} → ` : ""}
            {lastDest}
          </h1>
          <Badge variant={ended ? "secondary" : "default"}>
            {ended ? t.movements.statusEnded : t.movements.statusOpen}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Truck size={14} className="text-amber" />
            {movement.truck.name}
          </span>
          <span className="flex items-center gap-1.5">
            <User size={14} className="text-amber" />
            {movement.driver.name}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-amber" />
            <span className="font-mono tnum">{formatDate(movement.movedAt)}</span>
          </span>
        </div>
        {movement.notes && (
          <p className="text-sm text-muted-foreground mt-3 border-l-2 border-border pl-3">
            {movement.notes}
          </p>
        )}
      </header>

      <div className="road-line" />

      <LedgerPanel
        movementId={movement.id}
        status={movement.status}
        trips={trips}
        today={today}
        superadmin={superadmin}
      />

      {superadmin && (
        <div className="flex justify-end gap-1 border-t border-border pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/movements/${movement.id}/edit`}>{t.common.edit}</Link>
          </Button>
          <DeleteMovementButton
            id={movement.id}
            label={movement.destination}
          />
        </div>
      )}
    </div>
  );
}
