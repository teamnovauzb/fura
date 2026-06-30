import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { getT } from "@/i18n/server";
import { MovementForm } from "../movement-form";
import { createTransaction } from "../actions";

export default async function NewMovementPage() {
  await requireUser();
  const { t } = await getT();
  const [trucks, drivers] = await Promise.all([
    prisma.truck.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">
          <Link href="/movements" className="hover:text-foreground">
            {t.nav.movements}
          </Link>{" "}
          / {t.movements.newEyebrow}
        </p>
        <h1 className="text-3xl font-800 mt-1">{t.movements.newTitle}</h1>
      </header>

      <div className="road-line" />

      {trucks.length === 0 || drivers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="font-600">{t.movements.needTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.movements.needBody1}{" "}
            <Link href="/trucks" className="underline">
              {t.movements.needTruck}
            </Link>{" "}
            {t.movements.needAnd}{" "}
            <Link href="/drivers" className="underline">
              {t.movements.needDriver}
            </Link>{" "}
            {t.movements.needBody2}
          </p>
        </div>
      ) : (
        <MovementForm
          trucks={trucks}
          drivers={drivers}
          action={createTransaction}
          initial={{ movedAt: today, moneyGiven: "", extraSpending: "" }}
          submitLabel={t.movements.submitLog}
        />
      )}
    </div>
  );
}
