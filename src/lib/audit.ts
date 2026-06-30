import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type AuditInput = {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entity: "Truck" | "Driver" | "Transaction" | "User";
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Write an append-only audit entry. ALWAYS call this with the same `tx`
 * client used for the change itself, so the change and its audit record
 * commit or roll back together and can never drift apart.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const truck = await tx.truck.create({ ... });
 *     await writeAudit(tx, { userId, action: "CREATE", entity: "Truck", ... });
 *   });
 *
 * The app never updates or deletes rows in audit_log.
 */
export async function writeAudit(tx: Tx, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: toJson(input.before),
      after: toJson(input.after),
    },
  });
}

// Decimal/Date values aren't valid JSON — normalize before storing.
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
}
