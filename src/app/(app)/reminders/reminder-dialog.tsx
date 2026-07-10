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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton, FieldError } from "@/components/form-bits";
import { useI18n } from "@/i18n/provider";
import { createReminder, updateReminder, type ActionState } from "./actions";

type Option = { id: string; name: string };
type Reminder = {
  id: string;
  truckId: string;
  title: string;
  description: string | null;
  dueDate: string; // yyyy-mm-dd
};

export function ReminderDialog({
  trucks,
  reminder,
  trigger,
}: {
  trucks: Option[];
  reminder?: Reminder;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const action = reminder
    ? updateReminder.bind(null, reminder.id)
    : createReminder;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(reminder ? t.reminders.toastUpdated : t.reminders.toastAdded);
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, reminder, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {reminder ? t.reminders.dialogEdit : t.reminders.dialogAdd}
          </DialogTitle>
          <DialogDescription>{t.reminders.dialogDesc}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="truckId">{t.reminders.truck}</Label>
            <Select name="truckId" defaultValue={reminder?.truckId} required>
              <SelectTrigger id="truckId" className="w-full">
                <SelectValue placeholder={t.reminders.pickTruck} />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {tr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={state.fieldErrors?.truckId} />
          </div>
          <div>
            <Label htmlFor="title">{t.reminders.titleLabel}</Label>
            <Input
              id="title"
              name="title"
              defaultValue={reminder?.title}
              placeholder={t.reminders.titlePlaceholder}
              required
            />
            <FieldError message={state.fieldErrors?.title} />
          </div>
          <div>
            <Label htmlFor="dueDate">{t.reminders.dueDate}</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={reminder?.dueDate}
              className="font-mono"
              required
            />
            <FieldError message={state.fieldErrors?.dueDate} />
          </div>
          <div>
            <Label htmlFor="description">{t.reminders.descriptionLabel}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={reminder?.description ?? ""}
              placeholder={t.reminders.descriptionPlaceholder}
              rows={3}
            />
            <FieldError message={state.fieldErrors?.description} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <SubmitButton>
              {reminder ? t.common.saveChanges : t.reminders.addBtn}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
