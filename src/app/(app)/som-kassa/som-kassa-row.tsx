"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { fmtMoney, formatDate } from "@/lib/format";
import { useI18n } from "@/i18n/provider";

type ExpenseKind = "GENERAL" | "SALARY" | "CAR";

export function SomKassaRow({
  movementId,
  at,
  label,
  kind,
  route,
  truck,
  staff,
  type,
  amount,
}: {
  movementId: string;
  at: string;
  label: string | null;
  kind: ExpenseKind;
  route: string;
  truck: string;
  staff: string;
  type: "RECEIVED" | "SPENT";
  amount: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const income = type === "RECEIVED";
  const kindLabel = {
    GENERAL: t.movements.kindGeneral,
    SALARY: t.movements.kindSalary,
    CAR: t.movements.kindCar,
  };

  const openMovement = () => router.push(`/movements/${movementId}`);

  return (
    <TableRow
      tabIndex={0}
      role="link"
      className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
      onClick={openMovement}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMovement();
        }
      }}
    >
      <TableCell className="font-mono tnum text-xs text-muted-foreground">{formatDate(at)}</TableCell>
      <TableCell>
        <span className="font-500">{label ?? t.movements.entryUnlabeled}</span>
        {kind !== "GENERAL" && <Badge variant="outline" className="ml-2">{kindLabel[kind]}</Badge>}
      </TableCell>
      <TableCell className="font-500 text-primary">{route}</TableCell>
      <TableCell className="text-muted-foreground">{truck}</TableCell>
      <TableCell className="text-muted-foreground">{staff}</TableCell>
      <TableCell className={`text-right font-mono tnum font-700 ${income ? "text-go" : "text-rust"}`}>
        {income ? "+" : "−"}{fmtMoney(amount, "SOM")}
      </TableCell>
    </TableRow>
  );
}
