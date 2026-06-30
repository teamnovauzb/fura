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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton, FieldError } from "@/components/form-bits";
import { useI18n } from "@/i18n/provider";
import { createUser, type ActionState } from "./actions";

export function UserDialog({ trigger }: { trigger: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    createUser,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(t.staff.toastAdded);
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.staff.dialogTitle}</DialogTitle>
          <DialogDescription>{t.staff.dialogDesc}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">{t.staff.fullName}</Label>
            <Input id="name" name="name" required />
            <FieldError message={state.fieldErrors?.name} />
          </div>
          <div>
            <Label htmlFor="email">{t.staff.email}</Label>
            <Input id="email" name="email" type="email" required />
            <FieldError message={state.fieldErrors?.email} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="password">{t.staff.tempPassword}</Label>
              <Input
                id="password"
                name="password"
                type="text"
                className="font-mono"
                placeholder={t.staff.passwordHint}
                required
              />
              <FieldError message={state.fieldErrors?.password} />
            </div>
            <div>
              <Label htmlFor="role">{t.staff.roleLabel}</Label>
              <Select name="role" defaultValue="ADMIN">
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t.staff.roleAdmin}</SelectItem>
                  <SelectItem value="SUPERADMIN">
                    {t.staff.roleSuperadmin}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors?.role} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <SubmitButton>{t.staff.addBtn}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
