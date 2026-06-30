"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { driverSchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parse(formData: FormData) {
  return driverSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
}

export async function createDriver(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const { name, phone } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const driver = await tx.driver.create({
      data: { name, phone: phone || null, createdById: user.id },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Driver",
      entityId: driver.id,
      after: driver,
    });
  });

  revalidatePath("/drivers");
  return { ok: true };
}

export async function updateDriver(
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

  const { name, phone } = parsed.data;
  const before = await prisma.driver.findUnique({ where: { id } });
  if (!before) return { error: t.drivers.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.driver.update({
      where: { id },
      data: { name, phone: phone || null },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Driver",
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath("/drivers");
  return { ok: true };
}

export async function deactivateDriver(id: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();
  const before = await prisma.driver.findUnique({ where: { id } });
  if (!before) return { error: t.drivers.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.driver.update({
      where: { id },
      data: { active: !before.active },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Driver",
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath("/drivers");
  return { ok: true };
}
