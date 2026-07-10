"use client";

import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, formatDate } from "@/lib/format";
import { PairMoney, type Pair } from "@/components/money-pair";
import { useI18n } from "@/i18n/provider";
import { TruckDialog } from "./truck-dialog";
import { ToggleTruckActive } from "./toggle-active";
import { DeleteTruckButton } from "./delete-button";

/**
 * A trucks-table row that opens the truck's detail (expense) page on click.
 * The actions cell stops propagation so Edit/Retire/Delete don't also navigate.
 */
export function TruckRow({
  id,
  name,
  plate,
  price,
  currentValue,
  createdAt,
  active,
  superadmin,
}: {
  id: string;
  name: string;
  plate: string | null;
  price: number;
  currentValue: Pair;
  createdAt: string;
  active: boolean;
  superadmin: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <TableRow
      onClick={() => router.push(`/trucks/${id}`)}
      className={`cursor-pointer ${active ? "" : "opacity-55"}`}
    >
      <TableCell className="font-600">
        <span className="flex items-center gap-2">
          {name}
          {!active && (
            <Badge variant="outline" className="text-rust border-rust/40">
              {t.trucks.retired}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="font-mono uppercase text-muted-foreground">
        {plate ?? t.common.dash}
      </TableCell>
      <TableCell className="text-right font-mono tnum">{money(price)}</TableCell>
      <TableCell className="text-right font-mono tnum font-600">
        <PairMoney pair={currentValue} className="inline-block" />
      </TableCell>
      <TableCell className="font-mono tnum text-xs text-muted-foreground">
        {formatDate(createdAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1">
          <TruckDialog
            truck={{ id, name, plate, price: String(price) }}
            trigger={
              <Button variant="ghost" size="sm">
                {t.common.edit}
              </Button>
            }
          />
          {superadmin && <ToggleTruckActive id={id} active={active} />}
          {superadmin && <DeleteTruckButton id={id} name={name} />}
        </div>
      </TableCell>
    </TableRow>
  );
}
