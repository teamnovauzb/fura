"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { truckSchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parse(formData: FormData) {
  return truckSchema.safeParse({
    name: formData.get("name"),
    plate: formData.get("plate"),
    price: formData.get("price"),
  });
}

export async function createTruck(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const { name, plate, price } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const truck = await tx.truck.create({
      data: {
        name,
        plate: plate || null,
        price,
        createdById: user.id,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Truck",
      entityId: truck.id,
      after: truck,
    });
  });

  revalidatePath("/trucks");
  return { ok: true };
}

export async function updateTruck(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  const { t } = await getT();
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const { name, plate, price } = parsed.data;
  const before = await prisma.truck.findUnique({ where: { id } });
  if (!before) return { error: t.trucks.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.truck.update({
      where: { id },
      data: { name, plate: plate || null, price },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Truck",
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath("/trucks");
  return { ok: true };
}

/** Deactivate (soft-delete) a truck — superadmin only. */
export async function deactivateTruck(id: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();
  const before = await prisma.truck.findUnique({ where: { id } });
  if (!before) return { error: t.trucks.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.truck.update({
      where: { id },
      data: { active: !before.active },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Truck",
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath("/trucks");
  return { ok: true };
}
