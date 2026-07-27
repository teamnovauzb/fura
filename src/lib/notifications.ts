import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type NotificationType =
  | "TRUCK_CREATED"
  | "DRIVER_CREATED"
  | "USER_CREATED"
  | "MOVEMENT_CREATED"
  | "LEDGER_ENTRY_CREATED";

export async function notifyOtherUsers(
  tx: Tx,
  input: {
    actorId: string;
    type: NotificationType;
    subject: string;
    href?: string;
  },
) {
  const recipients = await tx.user.findMany({
    where: { active: true, id: { not: input.actorId } },
    select: { id: true },
  });
  if (!recipients.length) return;

  await tx.notification.createMany({
    data: recipients.map(({ id }) => ({
      recipientId: id,
      actorId: input.actorId,
      type: input.type,
      subject: input.subject.slice(0, 240),
      href: input.href ?? null,
    })),
  });
}
