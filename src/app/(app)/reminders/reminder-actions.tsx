"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import {
  completeReminder,
  reopenReminder,
  rescheduleReminder,
  deleteReminder,
} from "./actions";

export function CompleteButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-go hover:text-go"
      onClick={() =>
        start(async () => {
          const res = await completeReminder(id);
          if (res.error) toast.error(res.error);
          else toast.success(t.reminders.toastDone);
        })
      }
    >
      {t.reminders.markDone}
    </Button>
  );
}

export function ReopenButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reopenReminder(id);
          if (res.error) toast.error(res.error);
          else toast.success(t.reminders.toastReopened);
        })
      }
    >
      {t.reminders.reopen}
    </Button>
  );
}

export function RescheduleButton({
  id,
  dueDate,
}: {
  id: string;
  dueDate: string; // yyyy-mm-dd
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(dueDate);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t.reminders.reschedule}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reminders.rescheduleTitle}</DialogTitle>
          <DialogDescription>{t.reminders.rescheduleDesc}</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor={`resched-${id}`}>{t.reminders.dueDate}</Label>
          <Input
            id={`resched-${id}`}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={pending || !value}
            onClick={() =>
              start(async () => {
                const res = await rescheduleReminder(id, value);
                if (res.error) toast.error(res.error);
                else {
                  toast.success(t.reminders.toastRescheduled);
                  setOpen(false);
                }
              })
            }
          >
            {t.reminders.reschedule}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteReminderButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-rust hover:text-rust">
          {t.common.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reminders.deleteTitle}</DialogTitle>
          <DialogDescription>
            {label}. {t.reminders.deleteDesc}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteReminder(id);
                if (res.error) toast.error(res.error);
                else {
                  toast.success(t.reminders.toastDeleted);
                  setOpen(false);
                }
              })
            }
          >
            {pending ? t.common.deleting : t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
