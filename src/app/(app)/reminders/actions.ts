"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { reminderSchema, rescheduleSchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";
import { parseDueDate } from "@/lib/reminders";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Reminders surface on the dashboard and drive the nav badge, so revalidate
// both alongside the reminders page after every change.
function revalidate() {
  revalidatePath("/reminders");
  revalidatePath("/");
  revalidatePath("/", "layout");
}

function parse(formData: FormData) {
  return reminderSchema.safeParse({
    truckId: formData.get("truckId"),
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
  });
}

export async function createReminder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const { truckId, title, description, dueDate } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const reminder = await tx.reminder.create({
      data: {
        truckId,
        title,
        description: description || null,
        dueDate: parseDueDate(dueDate),
        createdById: user.id,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Reminder",
      entityId: reminder.id,
      after: reminder,
    });
  });

  revalidate();
  return { ok: true };
}

export async function updateReminder(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const before = await prisma.reminder.findUnique({ where: { id } });
  if (!before) return { error: t.reminders.notFound };

  const { truckId, title, description, dueDate } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const after = await tx.reminder.update({
      where: { id },
      data: {
        truckId,
        title,
        description: description || null,
        dueDate: parseDueDate(dueDate),
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Reminder",
      entityId: id,
      before,
      after,
    });
  });

  revalidate();
  return { ok: true };
}

/** Renew a reminder: push it to a new date and make it pending again. */
export async function rescheduleReminder(
  id: string,
  dueDateStr: string,
): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const parsed = rescheduleSchema.safeParse({ dueDate: dueDateStr });
  if (!parsed.success) return { error: t.reminders.pickDateError };

  const before = await prisma.reminder.findUnique({ where: { id } });
  if (!before) return { error: t.reminders.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.reminder.update({
      where: { id },
      data: {
        dueDate: parseDueDate(parsed.data.dueDate),
        status: "PENDING",
        completedAt: null,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Reminder",
      entityId: id,
      before,
      after,
    });
  });

  revalidate();
  return { ok: true };
}

/** Mark a reminder handled so it stops showing as due. */
export async function completeReminder(id: string): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const before = await prisma.reminder.findUnique({ where: { id } });
  if (!before) return { error: t.reminders.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.reminder.update({
      where: { id },
      data: { status: "DONE", completedAt: new Date() },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Reminder",
      entityId: id,
      before,
      after,
    });
  });

  revalidate();
  return { ok: true };
}

/** Reopen a completed reminder (keeps its date). */
export async function reopenReminder(id: string): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const before = await prisma.reminder.findUnique({ where: { id } });
  if (!before) return { error: t.reminders.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.reminder.update({
      where: { id },
      data: { status: "PENDING", completedAt: null },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "UPDATE",
      entity: "Reminder",
      entityId: id,
      before,
      after,
    });
  });

  revalidate();
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();
  const before = await prisma.reminder.findUnique({ where: { id } });
  if (!before) return { error: t.reminders.notFound };

  await prisma.$transaction(async (tx) => {
    await tx.reminder.delete({ where: { id } });
    await writeAudit(tx, {
      userId: user.id,
      action: "DELETE",
      entity: "Reminder",
      entityId: id,
      before,
    });
  });

  revalidate();
  return { ok: true };
}
