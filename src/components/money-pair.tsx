import { fmtMoney, type Currency } from "@/lib/format";

export type Pair = { SOM: number; USD: number };

/**
 * Render an amount that may exist in two currencies. so'm and $ are shown on
 * separate lines and never summed. A currency line is hidden when it's zero,
 * except we always show at least the USD line so a truly-empty value reads
 * "0 $" rather than blank.
 */
export function PairMoney({
  pair,
  colored,
  className,
}: {
  pair: Pair;
  colored?: boolean;
  className?: string;
}) {
  const lines: { cur: Currency; v: number }[] = [];
  if (pair.USD !== 0 || pair.SOM === 0) lines.push({ cur: "USD", v: pair.USD });
  if (pair.SOM !== 0) lines.push({ cur: "SOM", v: pair.SOM });

  return (
    <span className={className}>
      {lines.map(({ cur, v }) => (
        <span
          key={cur}
          className={`block whitespace-nowrap ${
            colored ? (v > 0 ? "text-go" : v < 0 ? "text-rust" : "") : ""
          }`}
        >
          {fmtMoney(v, cur)}
        </span>
      ))}
    </span>
  );
}
