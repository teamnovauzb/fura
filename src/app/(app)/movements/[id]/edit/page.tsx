import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/guards";
import { getT } from "@/i18n/server";
import { MovementForm } from "../../movement-form";
import { updateTransaction } from "../../actions";

export default async function EditMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Editing a movement is superadmin only — enforced here and in the action.
  await requireSuperadmin();
  const { t } = await getT();
  const { id } = await params;

  const [movement, trucks, drivers] = await Promise.all([
    prisma.transaction.findUnique({ where: { id } }),
    prisma.truck.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.driver.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!movement) notFound();

  const updateAction = updateTransaction.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">
          <Link href="/movements" className="hover:text-foreground">
            {t.nav.movements}
          </Link>{" "}
          / {t.movements.editEyebrow}
        </p>
        <h1 className="text-3xl font-800 mt-1">{t.movements.editTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.movements.editNote}
        </p>
      </header>

      <div className="road-line" />

      <MovementForm
        trucks={trucks}
        drivers={drivers}
        action={updateAction}
        submitLabel={t.common.saveChanges}
        initial={{
          truckId: movement.truckId,
          driverId: movement.driverId,
          origin: movement.origin ?? "",
          destination: movement.destination,
          moneyGiven: movement.moneyGiven.toString(),
          extraSpending: movement.extraSpending.toString(),
          revenue: movement.revenue?.toString() ?? "",
          notes: movement.notes ?? "",
          movedAt: movement.movedAt.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
