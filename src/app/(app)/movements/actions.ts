"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { transactionSchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parse(formData: FormData) {
  return transactionSchema.safeParse({
    truckId: formData.get("truckId"),
    driverId: formData.get("driverId"),
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    moneyGiven: formData.get("moneyGiven"),
    extraSpending: formData.get("extraSpending"),
    revenue: formData.get("revenue"),
    notes: formData.get("notes"),
    movedAt: formData.get("movedAt"),
  });
}

function toData(d: ReturnType<typeof transactionSchema.parse>) {
  return {
    truckId: d.truckId,
    driverId: d.driverId,
    origin: d.origin || null,
    destination: d.destination,
    moneyGiven: d.moneyGiven,
    extraSpending: d.extraSpending,
    revenue: d.revenue,
    notes: d.notes || null,
    movedAt: d.movedAt ? new Date(d.movedAt) : new Date(),
  };
}

/** Any signed-in staff member can log a movement. */
export async function createTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: { ...toData(parsed.data), createdById: user.id },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Transaction",
      entityId: txn.id,
      after: txn,
    });
  });

  revalidatePath("/movements");
  revalidatePath("/");
  redirect("/movements");
}

/** Editing a movement is SUPERADMIN ONLY. */
export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertSuperadmin();
  const parsed = parse(formData);
  const { t } = await getT();
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) return { error: t.movements.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.transaction.update({
      where: { id },
      data: toData(parsed.data),
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Transaction",
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath("/movements");
  revalidatePath("/");
  redirect("/movements");
}

/** Deleting a movement is SUPERADMIN ONLY. The audit entry survives. */
export async function deleteTransaction(id: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();
  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) return { error: t.movements.notFound };

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } });
    await writeAudit(tx, {
      userId: user.id,
      action: "DELETE",
      entity: "Transaction",
      entityId: id,
      before,
    });
  });

  revalidatePath("/movements");
  revalidatePath("/");
  return { ok: true };
}
