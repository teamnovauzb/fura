"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, assertSuperadmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { transactionSchema, ledgerEntrySchema } from "@/lib/validation";
import { fieldErrorsFrom } from "@/lib/forms";
import { getT } from "@/i18n/server";
import {
  removeLedgerImage,
  storeLedgerImage,
  type StoredLedgerImage,
} from "@/lib/ledger-images";
import { notifyOtherUsers } from "@/lib/notifications";

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
    currency: formData.get("currency") ?? undefined,
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
  const { t } = await getT();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const d = parsed.data;
  const at = d.movedAt ? new Date(d.movedAt) : new Date();

  const seedImages: Record<"moneyGiven" | "extraSpending" | "revenue", StoredLedgerImage | null> = {
    moneyGiven: null,
    extraSpending: null,
    revenue: null,
  };
  const imageSpecs = [
    { key: "moneyGiven" as const, field: "moneyGivenImage", amount: d.moneyGiven },
    { key: "extraSpending" as const, field: "extraSpendingImage", amount: d.extraSpending },
    { key: "revenue" as const, field: "revenueImage", amount: d.revenue ?? 0 },
  ];

  for (const spec of imageSpecs) {
    let upload: Awaited<ReturnType<typeof storeLedgerImage>>;
    try {
      upload = await storeLedgerImage(formData.get(spec.field));
    } catch {
      await Promise.all(Object.values(seedImages).map((image) => removeLedgerImage(image?.imagePath)));
      return { error: t.movements.imageSaveFailed };
    }
    if (upload.error || (upload.image && spec.amount <= 0)) {
      await removeLedgerImage(upload.image?.imagePath);
      await Promise.all(Object.values(seedImages).map((image) => removeLedgerImage(image?.imagePath)));
      if (upload.error === "tooLarge") return { error: t.movements.imageTooLarge };
      if (upload.error === "invalid") return { error: t.movements.imageInvalid };
      return { error: t.movements.imageNeedsAmount };
    }
    seedImages[spec.key] = upload.image;
  }

  // The movement opens as a live ledger. The amounts entered on the form are
  // seeded as its first entries: money given + extra are SPENT, revenue (if
  // any) is RECEIVED. Staff keep adding entries on the detail page until they
  // press End.
  let newId: string;
  try {
    newId = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: { ...toData(d), createdById: user.id },
    });

    // The log always starts with its first leg (trip 1).
    const trip = await tx.trip.create({
      data: {
        transactionId: txn.id,
        origin: d.origin || null,
        destination: d.destination,
        order: 1,
      },
    });

    const seeds: {
      type: "RECEIVED" | "SPENT";
      amount: number;
      label: string;
      image: StoredLedgerImage | null;
    }[] = [];
    if (d.moneyGiven > 0)
      seeds.push({ type: "SPENT", amount: d.moneyGiven, label: "Money given", image: seedImages.moneyGiven });
    if (d.extraSpending > 0)
      seeds.push({ type: "SPENT", amount: d.extraSpending, label: "Extra on the road", image: seedImages.extraSpending });
    if (d.revenue != null)
      seeds.push({ type: "RECEIVED", amount: d.revenue, label: "Revenue", image: seedImages.revenue });

    if (seeds.length > 0)
      await tx.ledgerEntry.createMany({
        data: seeds.map((s) => ({
          transactionId: txn.id,
          tripId: trip.id,
          type: s.type,
          currency: d.currency,
          amount: s.amount,
          label: s.label,
          at,
          handledById: user.id,
          ...s.image,
        })),
      });

    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Transaction",
      entityId: txn.id,
      after: txn,
    });
    await notifyOtherUsers(tx, {
      actorId: user.id,
      type: "MOVEMENT_CREATED",
      subject: `${d.origin ? `${d.origin} → ` : ""}${d.destination}`,
      href: `/movements/${txn.id}`,
    });
      return txn.id;
    });
  } catch {
    await Promise.all(Object.values(seedImages).map((image) => removeLedgerImage(image?.imagePath)));
    return { error: t.movements.imageSaveFailed };
  }

  revalidatePath("/movements");
  revalidatePath("/finance");
  revalidatePath("/som-kassa");
  revalidatePath("/");
  redirect(`/movements/${newId}`);
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

  const images = await prisma.ledgerEntry.findMany({
    where: { transactionId: id },
    select: { imagePath: true },
  });

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

  await Promise.all(images.map((entry) => removeLedgerImage(entry.imagePath)));

  revalidatePath("/movements");
  revalidatePath("/finance");
  revalidatePath("/som-kassa");
  revalidatePath("/");
  return { ok: true };
}

function revalidateMovement(id: string) {
  revalidatePath(`/movements/${id}`);
  revalidatePath("/movements");
  revalidatePath("/finance");
  revalidatePath("/som-kassa");
  revalidatePath("/");
}

/**
 * Add a money line (received or spent) to an OPEN movement. Any signed-in
 * staff member can do this; the entry records who handled the cash.
 */
export async function addLedgerEntry(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();

  const parsed = ledgerEntrySchema.safeParse({
    type: formData.get("type"),
    kind: formData.get("kind") ?? undefined,
    amount: formData.get("amount"),
    label: formData.get("label"),
    at: formData.get("at"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { transactionId: true, transaction: { select: { status: true } } },
  });
  if (!trip) return { error: t.movements.notFound };
  // A closed trip is locked for regular staff; superadmin can still edit it.
  if (trip.transaction.status === "ENDED" && user.role !== "SUPERADMIN")
    return { error: t.movements.endedLocked };

  let upload: Awaited<ReturnType<typeof storeLedgerImage>>;
  try {
    upload = await storeLedgerImage(formData.get("image"));
  } catch {
    return { error: t.movements.imageSaveFailed };
  }
  if (upload.error === "tooLarge") return { error: t.movements.imageTooLarge };
  if (upload.error === "invalid") return { error: t.movements.imageInvalid };

  const { type, amount, label, at, currency } = parsed.data;
  // Categories only apply to money spent; income is always general.
  const kind = type === "SPENT" ? parsed.data.kind : "GENERAL";
  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: trip.transactionId,
          tripId,
          type,
          kind,
          currency,
          amount,
          label: label || null,
          at: at ? new Date(at) : new Date(),
          handledById: user.id,
          ...upload.image,
        },
      });
      await writeAudit(tx, {
        userId: user.id,
        action: "CREATE",
        entity: "LedgerEntry",
        entityId: entry.id,
        after: entry,
      });
      await notifyOtherUsers(tx, {
        actorId: user.id,
        type: "LEDGER_ENTRY_CREATED",
        subject: `${label || type} · ${amount} ${currency}`,
        href: `/movements/${trip.transactionId}`,
      });
    });
  } catch {
    await removeLedgerImage(upload.image?.imagePath);
    return { error: t.movements.imageSaveFailed };
  }

  revalidateMovement(trip.transactionId);
  return { ok: true };
}

/** Add another leg (trip) to an open movement. */
export async function addTrip(
  transactionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();

  const destination = (formData.get("destination") ?? "").toString().trim();
  const origin = (formData.get("origin") ?? "").toString().trim();
  if (!destination)
    return { fieldErrors: { destination: t.errors.destinationRequired } };

  const movement = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { status: true, _count: { select: { trips: true } } },
  });
  if (!movement) return { error: t.movements.notFound };
  if (movement.status === "ENDED" && user.role !== "SUPERADMIN")
    return { error: t.movements.endedLocked };

  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        transactionId,
        origin: origin || null,
        destination,
        order: movement._count.trips + 1,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "CREATE",
      entity: "Trip",
      entityId: trip.id,
      after: trip,
    });
  });

  revalidateMovement(transactionId);
  return { ok: true };
}

/** Remove a leg (and its ledger entries). Superadmin only. */
export async function deleteTrip(tripId: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();

  const before = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, transactionId: true, destination: true },
  });
  if (!before) return { error: t.movements.notFound };

  const images = await prisma.ledgerEntry.findMany({
    where: { tripId },
    select: { imagePath: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.trip.delete({ where: { id: tripId } });
    await writeAudit(tx, {
      userId: user.id,
      action: "DELETE",
      entity: "Trip",
      entityId: tripId,
      before,
    });
  });

  await Promise.all(images.map((entry) => removeLedgerImage(entry.imagePath)));

  revalidateMovement(before.transactionId);
  return { ok: true };
}

/** Remove a ledger entry from an OPEN movement. */
export async function deleteLedgerEntry(entryId: string): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();

  const before = await prisma.ledgerEntry.findUnique({
    where: { id: entryId },
    include: { transaction: { select: { id: true, status: true } } },
  });
  if (!before) return { error: t.movements.notFound };
  if (before.transaction.status === "ENDED" && user.role !== "SUPERADMIN")
    return { error: t.movements.endedLocked };

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.delete({ where: { id: entryId } });
    await writeAudit(tx, {
      userId: user.id,
      action: "DELETE",
      entity: "LedgerEntry",
      entityId: entryId,
      before,
    });
  });

  await removeLedgerImage(before.imagePath);

  revalidateMovement(before.transaction.id);
  return { ok: true };
}

/**
 * Edit a ledger entry — superadmin only, allowed on open OR closed trips so
 * the owner can correct a finished trip's books.
 */
export async function editLedgerEntry(
  entryId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();

  const parsed = ledgerEntrySchema.safeParse({
    type: formData.get("type"),
    kind: formData.get("kind") ?? undefined,
    amount: formData.get("amount"),
    label: formData.get("label"),
    at: formData.get("at"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error, t.errors) };
  }

  const before = await prisma.ledgerEntry.findUnique({
    where: { id: entryId },
    include: { transaction: { select: { id: true } } },
  });
  if (!before) return { error: t.movements.notFound };

  let upload: Awaited<ReturnType<typeof storeLedgerImage>>;
  try {
    upload = await storeLedgerImage(formData.get("image"));
  } catch {
    return { error: t.movements.imageSaveFailed };
  }
  if (upload.error === "tooLarge") return { error: t.movements.imageTooLarge };
  if (upload.error === "invalid") return { error: t.movements.imageInvalid };

  const { type, amount, label, at, currency } = parsed.data;
  const kind = type === "SPENT" ? parsed.data.kind : "GENERAL";
  try {
    await prisma.$transaction(async (tx) => {
      const after = await tx.ledgerEntry.update({
        where: { id: entryId },
        data: {
          type,
          kind,
          currency,
          amount,
          label: label || null,
          at: at ? new Date(at) : before.at,
          ...(upload.image ?? {}),
        },
      });
      await writeAudit(tx, {
        userId: user.id,
        action: "UPDATE",
        entity: "LedgerEntry",
        entityId: entryId,
        before,
        after,
      });
    });
  } catch {
    await removeLedgerImage(upload.image?.imagePath);
    return { error: t.movements.imageSaveFailed };
  }

  if (upload.image && before.imagePath !== upload.image.imagePath)
    await removeLedgerImage(before.imagePath);

  revalidateMovement(before.transaction.id);
  return { ok: true };
}

/** Close a movement: lock the ledger and stamp the profit as final. */
export async function endMovement(id: string): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();

  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) return { error: t.movements.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.transaction.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date() },
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

  revalidateMovement(id);
  return { ok: true };
}

/** Reopen a closed movement so entries can be added again (superadmin only). */
export async function reopenMovement(id: string): Promise<ActionState> {
  const user = await assertSuperadmin();
  const { t } = await getT();

  const before = await prisma.transaction.findUnique({ where: { id } });
  if (!before) return { error: t.movements.notFound };

  await prisma.$transaction(async (tx) => {
    const after = await tx.transaction.update({
      where: { id },
      data: { status: "OPEN", endedAt: null },
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

  revalidateMovement(id);
  return { ok: true };
}
