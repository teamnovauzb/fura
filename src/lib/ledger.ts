import type { LedgerType, Currency as PrismaCurrency } from "@prisma/client";
import { toNumber } from "@/lib/format";
import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;
type EntryLike = {
  type: LedgerType;
  amount: DecimalLike;
  currency?: PrismaCurrency | null;
};
type MovementLike = {
  entries?: EntryLike[] | null;
  moneyGiven: DecimalLike;
  extraSpending: DecimalLike;
  revenue: DecimalLike;
};

/** A value that can exist in two currencies at once (never summed together). */
export type Pair = { SOM: number; USD: number };

export type LedgerTotals = {
  received: Pair;
  spent: Pair;
  profit: Pair;
};

export function emptyPair(): Pair {
  return { SOM: 0, USD: 0 };
}

export function addPair(a: Pair, b: Pair): Pair {
  return { SOM: a.SOM + b.SOM, USD: a.USD + b.USD };
}

export function subPair(a: Pair, b: Pair): Pair {
  return { SOM: a.SOM - b.SOM, USD: a.USD - b.USD };
}

export function pairIsZero(p: Pair): boolean {
  return p.SOM === 0 && p.USD === 0;
}

/**
 * Received / spent / profit for a movement, split by currency.
 *
 * so'm and USD amounts are tallied independently and never converted or added
 * together. Movements logged before the ledger existed have no entries — for
 * those we fall back to the legacy columns, treated as so'm.
 */
export function ledgerTotals(m: MovementLike): LedgerTotals {
  const received = emptyPair();
  const spent = emptyPair();
  const entries = m.entries ?? [];

  if (entries.length > 0) {
    for (const e of entries) {
      const cur: keyof Pair = e.currency === "USD" ? "USD" : "SOM";
      const amt = toNumber(e.amount);
      if (e.type === "RECEIVED") received[cur] += amt;
      else spent[cur] += amt;
    }
  } else {
    received.SOM = toNumber(m.revenue);
    spent.SOM = toNumber(m.moneyGiven) + toNumber(m.extraSpending);
  }

  return { received, spent, profit: subPair(received, spent) };
}
