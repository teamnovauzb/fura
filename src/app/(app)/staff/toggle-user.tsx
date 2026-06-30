"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { toggleUserActive } from "./actions";

export function ToggleUser({
  id,
  active,
  disabled,
}: {
  id: string;
  active: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending || disabled}
      className={active ? "text-rust hover:text-rust" : "text-go hover:text-go"}
      onClick={() =>
        start(async () => {
          const res = await toggleUserActive(id);
          if (res.error) toast.error(res.error);
          else
            toast.success(
              active ? t.staff.toastRevoked : t.staff.toastRestored,
            );
        })
      }
    >
      {active ? t.staff.revoke : t.staff.restore}
    </Button>
  );
}
