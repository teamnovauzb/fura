"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { deactivateDriver } from "./actions";

export function ToggleDriverActive({
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
          const res = await deactivateDriver(id);
          if (res.error) toast.error(res.error);
          else
            toast.success(
              active
                ? t.drivers.toastDeactivated
                : t.drivers.toastReactivated,
            );
        })
      }
    >
      {active ? t.drivers.deactivate : t.drivers.reactivate}
    </Button>
  );
}
