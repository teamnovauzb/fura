"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { newUserSchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Never let the password hash reach the audit log.
function safe(user: { id: string; name: string; email: string; role: string; active: boolean }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertSuperadmin();

  const parsed = newUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  const { t } = await getT();
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const { name, email, password, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: t.staff.emailTaken } };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role },
    });
    await writeAudit(tx, {
      userId: actor.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      after: safe(user),
    });
  });

  revalidatePath("/staff");
  return { ok: true };
}

export async function toggleUserActive(id: string): Promise<ActionState> {
  const actor = await assertSuperadmin();
  const { t } = await getT();

  if (id === actor.id) {
    return { error: t.staff.cantSelfDeactivate };
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return { error: t.staff.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.user.update({
      where: { id },
      data: { active: !before.active },
    });
    await writeAudit(tx, {
      userId: actor.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      before: safe(before),
      after: safe(after),
    });
  });

  revalidatePath("/staff");
  return { ok: true };
}
