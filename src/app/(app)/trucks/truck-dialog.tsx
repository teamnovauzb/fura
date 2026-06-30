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
import { MoneyInput } from "@/components/money-input";
import { useI18n } from "@/i18n/provider";
import { createTruck, updateTruck, type ActionState } from "./actions";

type Truck = {
  id: string;
  name: string;
  plate: string | null;
  price: string;
};

export function TruckDialog({
  truck,
  trigger,
}: {
  truck?: Truck;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const action = truck ? updateTruck.bind(null, truck.id) : createTruck;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(truck ? t.trucks.toastUpdated : t.trucks.toastAdded);
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, truck, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {truck ? t.trucks.dialogEdit : t.trucks.dialogAdd}
          </DialogTitle>
          <DialogDescription>{t.trucks.dialogDesc}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">{t.trucks.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={truck?.name}
              placeholder={t.trucks.namePlaceholder}
              required
            />
            <FieldError message={state.fieldErrors?.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="plate">{t.trucks.plateLabel}</Label>
              <Input
                id="plate"
                name="plate"
                defaultValue={truck?.plate ?? ""}
                placeholder="01 A 123 AA"
                className="font-mono uppercase"
              />
              <FieldError message={state.fieldErrors?.plate} />
            </div>
            <div>
              <Label htmlFor="price">{t.trucks.rateLabel}</Label>
              <MoneyInput
                id="price"
                name="price"
                defaultValue={truck?.price}
                className="font-mono"
                required
              />
              <FieldError message={state.fieldErrors?.price} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <SubmitButton>
              {truck ? t.common.saveChanges : t.trucks.addBtn}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
