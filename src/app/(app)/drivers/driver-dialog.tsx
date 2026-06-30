"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton, FieldError } from "@/components/form-bits";
import { useI18n } from "@/i18n/provider";
import { createDriver, updateDriver, type ActionState } from "./actions";

type Driver = { id: string; name: string; phone: string | null };

export function DriverDialog({
  driver,
  trigger,
}: {
  driver?: Driver;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const action = driver ? updateDriver.bind(null, driver.id) : createDriver;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(driver ? t.drivers.toastUpdated : t.drivers.toastAdded);
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, driver, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {driver ? t.drivers.dialogEdit : t.drivers.dialogAdd}
          </DialogTitle>
          <DialogDescription>{t.drivers.dialogDesc}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">{t.drivers.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={driver?.name}
              placeholder={t.drivers.namePlaceholder}
              required
            />
            <FieldError message={state.fieldErrors?.name} />
          </div>
          <div>
            <Label htmlFor="phone">{t.drivers.phoneLabel}</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={driver?.phone ?? ""}
              placeholder="+998 90…"
              className="font-mono"
            />
            <FieldError message={state.fieldErrors?.phone} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <SubmitButton>
              {driver ? t.common.saveChanges : t.drivers.addBtn}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
