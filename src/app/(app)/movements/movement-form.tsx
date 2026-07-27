"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
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
import { MoneyInput } from "@/components/money-input";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/i18n/provider";
import type { ActionState } from "./actions";

type Option = { id: string; name: string };
type Initial = {
  truckId: string;
  driverId: string;
  origin: string;
  destination: string;
  moneyGiven: string;
  extraSpending: string;
  revenue: string;
  notes: string;
  movedAt: string; // yyyy-mm-dd
};

function SeedImageInput({ id, name }: { id: string; name: string }) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mt-3">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs">
        <ImageIcon className="size-3.5 text-muted-foreground" />
        {t.movements.imageLabel}
      </Label>
      <Input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="cursor-pointer text-xs file:mr-2"
      />
      <p className="mt-1 text-[0.7rem] text-muted-foreground">{t.movements.imageHint}</p>
      {file && <LocalImagePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />}
    </div>
  );
}

function LocalImagePreview({ file }: { file: File }) {
  const { t } = useI18n();
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/30 p-1.5">
      <Image
        src={url}
        alt={t.movements.imageLabel}
        width={240}
        height={150}
        unoptimized
        className="h-24 w-full rounded-lg object-cover"
      />
      <p className="mt-1 truncate px-1 text-[0.7rem] text-muted-foreground">{file.name}</p>
    </div>
  );
}

export function MovementForm({
  trucks,
  drivers,
  action,
  initial,
  submitLabel,
  showImageUploads = false,
}: {
  trucks: Option[];
  drivers: Option[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: Partial<Initial>;
  submitLabel: string;
  showImageUploads?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  // Live net readout — revenue minus money given minus extra spending.
  // These hold the un-spaced numeric strings reported by MoneyInput.
  const [given, setGiven] = useState(initial?.moneyGiven ?? "");
  const [extra, setExtra] = useState(initial?.extraSpending ?? "");
  const [revenue, setRevenue] = useState(initial?.revenue ?? "");
  const [currency, setCurrency] = useState<"SOM" | "USD">("USD");
  const net =
    (Number(revenue) || 0) - (Number(given) || 0) - (Number(extra) || 0);

  if (state.error) toast.error(state.error);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="truckId">{t.movements.truck}</Label>
          <Select name="truckId" defaultValue={initial?.truckId} required>
            <SelectTrigger id="truckId" className="w-full">
              <SelectValue placeholder={t.movements.pickTruck} />
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
          <Label htmlFor="driverId">{t.movements.driver}</Label>
          <Select name="driverId" defaultValue={initial?.driverId} required>
            <SelectTrigger id="driverId" className="w-full">
              <SelectValue placeholder={t.movements.pickDriver} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.fieldErrors?.driverId} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="origin">{t.movements.fromOptional}</Label>
          <Input
            id="origin"
            name="origin"
            defaultValue={initial?.origin}
            placeholder={t.movements.fromPlaceholder}
          />
        </div>
        <div>
          <Label htmlFor="destination">{t.movements.to}</Label>
          <Input
            id="destination"
            name="destination"
            defaultValue={initial?.destination}
            placeholder={t.movements.toPlaceholder}
            required
          />
          <FieldError message={state.fieldErrors?.destination} />
        </div>
      </div>

      <div className="road-line" />

      <div className="max-w-[12rem]">
        <Label htmlFor="currency">{t.movements.currency}</Label>
        <Select
          name="currency"
          value={currency}
          onValueChange={(v) => setCurrency(v as "SOM" | "USD")}
        >
          <SelectTrigger id="currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SOM">{t.movements.curSom}</SelectItem>
            <SelectItem value="USD">{t.movements.curUsd}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="moneyGiven">{t.movements.moneyGiven}</Label>
          <MoneyInput
            id="moneyGiven"
            name="moneyGiven"
            className="font-mono"
            defaultValue={initial?.moneyGiven}
            onRaw={setGiven}
            required
          />
          <FieldError message={state.fieldErrors?.moneyGiven} />
          {showImageUploads && <SeedImageInput id="moneyGivenImage" name="moneyGivenImage" />}
        </div>
        <div>
          <Label htmlFor="extraSpending">{t.movements.extraSpending}</Label>
          <MoneyInput
            id="extraSpending"
            name="extraSpending"
            className="font-mono"
            defaultValue={initial?.extraSpending}
            onRaw={setExtra}
          />
          <FieldError message={state.fieldErrors?.extraSpending} />
          {showImageUploads && <SeedImageInput id="extraSpendingImage" name="extraSpendingImage" />}
        </div>
        <div>
          <Label htmlFor="revenue">{t.movements.revenueOptional}</Label>
          <MoneyInput
            id="revenue"
            name="revenue"
            className="font-mono"
            defaultValue={initial?.revenue}
            onRaw={setRevenue}
          />
          <FieldError message={state.fieldErrors?.revenue} />
          {showImageUploads && <SeedImageInput id="revenueImage" name="revenueImage" />}
        </div>
      </div>

      {/* Live net readout — odometer style */}
      <div className="flex items-center justify-between rounded-md bg-secondary px-4 py-3">
        <span className="eyebrow">{t.movements.netForTrip}</span>
        <span
          className={`font-mono tnum text-lg font-700 ${
            net > 0 ? "text-go" : net < 0 ? "text-rust" : "text-foreground"
          }`}
        >
          {fmtMoney(net, currency)}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="movedAt">{t.common.date}</Label>
          <Input
            id="movedAt"
            name="movedAt"
            type="date"
            defaultValue={initial?.movedAt}
            className="font-mono"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">{t.movements.notesOptional}</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
          placeholder={t.movements.notesPlaceholder}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t.common.cancel}
        </Button>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
