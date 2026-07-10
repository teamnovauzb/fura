"use client";

import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PairMoney, type Pair } from "@/components/money-pair";
import { useI18n } from "@/i18n/provider";
import { DeleteMovementButton } from "./delete-button";

/**
 * A movements-table row that navigates to the trip on click. The actions cell
 * stops propagation so Delete doesn't also open the trip.
 */
export function MovementRow({
  id,
  dateStr,
  route,
  truck,
  driver,
  received,
  spent,
  profit,
  ended,
  superadmin,
}: {
  id: string;
  dateStr: string;
  route: string;
  truck: string;
  driver: string;
  received: Pair;
  spent: Pair;
  profit: Pair;
  ended: boolean;
  superadmin: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <TableRow
      onClick={() => router.push(`/movements/${id}`)}
      className="cursor-pointer"
    >
      <TableCell className="font-mono tnum text-xs text-muted-foreground whitespace-nowrap">
        {dateStr}
      </TableCell>
      <TableCell className="font-500 whitespace-nowrap">{route}</TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {truck}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {driver}
      </TableCell>
      <TableCell className="text-right font-mono tnum text-go whitespace-nowrap">
        <PairMoney pair={received} className="inline-block" />
      </TableCell>
      <TableCell className="text-right font-mono tnum text-rust whitespace-nowrap">
        <PairMoney pair={spent} className="inline-block" />
      </TableCell>
      <TableCell className="text-right font-mono tnum whitespace-nowrap">
        <PairMoney pair={profit} colored className="inline-block" />
      </TableCell>
      <TableCell>
        <Badge variant={ended ? "secondary" : "default"}>
          {ended ? t.movements.statusEnded : t.movements.statusOpen}
        </Badge>
      </TableCell>
      {superadmin && (
        <TableCell
          className="text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <DeleteMovementButton id={id} label={route} />
        </TableCell>
      )}
    </TableRow>
  );
}
