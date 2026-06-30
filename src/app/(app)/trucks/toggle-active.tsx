"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { deactivateTruck } from "./actions";

export function ToggleTruckActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className={active ? "text-rust hover:text-rust" : "text-go hover:text-go"}
      onClick={() =>
        start(async () => {
          const res = await deactivateTruck(id);
          if (res.error) toast.error(res.error);
          else
            toast.success(
              active ? t.trucks.toastRetired : t.trucks.toastReactivated,
            );
        })
      }
    >
      {active ? t.trucks.retire : t.trucks.reactivate}
    </Button>
  );
}
