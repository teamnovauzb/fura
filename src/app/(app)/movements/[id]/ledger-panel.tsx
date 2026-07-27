"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ImageIcon, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/money-input";
import { PairMoney, type Pair } from "@/components/money-pair";
import { fmtMoney, type Currency } from "@/lib/format";
import { useI18n } from "@/i18n/provider";
import { fmt } from "@/i18n/config";
import {
  addLedgerEntry,
  editLedgerEntry,
  deleteLedgerEntry,
  addTrip,
  deleteTrip,
  endMovement,
  reopenMovement,
} from "../actions";

export type ExpenseKind = "GENERAL" | "SALARY" | "CAR";

export type LedgerEntryView = {
  id: string;
  type: "RECEIVED" | "SPENT";
  kind: ExpenseKind;
  currency: Currency;
  amount: number;
  label: string | null;
  imageName: string | null;
  hasImage: boolean;
  at: string; // yyyy-mm-dd
  handledBy: string;
};

export type TripView = {
  id: string;
  order: number;
  origin: string | null;
  destination: string;
  entries: LedgerEntryView[];
};

function totals(entries: LedgerEntryView[]) {
  const received: Pair = { SOM: 0, USD: 0 };
  const spent: Pair = { SOM: 0, USD: 0 };
  for (const e of entries) {
    const cur: keyof Pair = e.currency === "USD" ? "USD" : "SOM";
    if (e.type === "RECEIVED") received[cur] += e.amount;
    else spent[cur] += e.amount;
  }
  const profit: Pair = {
    SOM: received.SOM - spent.SOM,
    USD: received.USD - spent.USD,
  };
  return { received, spent, profit };
}

const routeOf = (t: TripView) =>
  t.origin ? `${t.origin} → ${t.destination}` : t.destination;

function SelectedImagePreview({ file, label }: { file: File; label: string }) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
      <Image
        src={url}
        alt={label}
        width={112}
        height={80}
        unoptimized
        className="h-20 w-28 rounded-lg object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-600">{file.name}</p>
        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
    </div>
  );
}

function LedgerImagePreview({ entryId, imageName }: { entryId: string; imageName: string | null }) {
  const { t } = useI18n();
  const src = `/api/ledger-images/${entryId}`;
  const alt = imageName ?? t.movements.viewImage;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-1.5 pr-3 text-xs font-600 text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
          title={alt}
        >
          <Image
            src={src}
            alt={alt}
            width={72}
            height={52}
            unoptimized
            className="h-12 w-16 rounded-md object-cover ring-1 ring-black/5"
          />
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" />
            {t.movements.viewImage}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl bg-black/95 p-3 ring-white/10">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="flex max-h-[82vh] min-h-40 items-center justify-center overflow-hidden rounded-lg">
          <Image
            src={src}
            alt={alt}
            width={1800}
            height={1400}
            unoptimized
            className="max-h-[82vh] h-auto w-auto max-w-full object-contain"
          />
        </div>
        {imageName && <p className="truncate px-1 text-center text-xs text-white/70">{imageName}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function LedgerPanel({
  movementId,
  status,
  trips,
  today,
  superadmin,
}: {
  movementId: string;
  status: "OPEN" | "ENDED";
  trips: TripView[];
  today: string;
  superadmin: boolean;
}) {
  const { t } = useI18n();
  const open = status === "OPEN";
  const canEdit = open || superadmin;

  const all = trips.flatMap((tr) => tr.entries);
  const { received, spent, profit } = totals(all);
  const lastDestination = trips.length ? trips[trips.length - 1].destination : "";

  const [activeId, setActiveId] = useState(trips[trips.length - 1]?.id ?? "");
  const active = trips.find((tr) => tr.id === activeId) ?? trips[trips.length - 1];

  return (
    <div className="space-y-5">
      {/* Whole-log summary: received · spent · profit across every leg */}
      <SummaryBand received={received} spent={spent} profit={profit} big />

      {/* Trip switcher — tap a leg to view it */}
      <div className="flex flex-wrap items-center gap-2">
        {trips.map((trip) => {
          const on = active?.id === trip.id;
          return (
            <button
              key={trip.id}
              type="button"
              onClick={() => setActiveId(trip.id)}
              className={`rounded-md border px-3.5 py-2 text-sm font-600 transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {fmt(t.movements.tripN, { n: trip.order })}
            </button>
          );
        })}
        {canEdit && (
          <NewTrip movementId={movementId} defaultOrigin={lastDestination} />
        )}
      </div>

      {active && (
        <TripCard
          key={active.id}
          trip={active}
          canDelete={superadmin && trips.length > 1}
          canEdit={canEdit}
          superadmin={superadmin}
          today={today}
        />
      )}

      {open ? (
        <div className="flex justify-end">
          <EndTrip movementId={movementId} />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-dashed border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {t.movements.endedLocked}
          </span>
          {superadmin && <ReopenTrip movementId={movementId} />}
        </div>
      )}
    </div>
  );
}

function SummaryBand({
  received,
  spent,
  profit,
  big,
}: {
  received: Pair;
  spent: Pair;
  profit: Pair;
  big?: boolean;
}) {
  const { t } = useI18n();
  const size = big ? "text-sm sm:text-base" : "text-xs sm:text-sm";
  return (
    <div className="grid grid-cols-3 rounded-lg border border-border bg-card overflow-hidden divide-x divide-border">
      <div className="p-3 sm:p-4">
        <p className="eyebrow">{t.movements.received}</p>
        <PairMoney
          pair={received}
          className={`mt-1.5 font-mono tnum font-700 text-go leading-tight ${size}`}
        />
      </div>
      <div className="p-3 sm:p-4">
        <p className="eyebrow">{t.movements.spent}</p>
        <PairMoney
          pair={spent}
          className={`mt-1.5 font-mono tnum font-700 text-rust leading-tight ${size}`}
        />
      </div>
      <div className="p-3 sm:p-4 bg-secondary/50">
        <p className="eyebrow text-foreground/70">{t.movements.profit}</p>
        <PairMoney
          pair={profit}
          colored
          className={`mt-1.5 font-mono tnum font-800 leading-tight ${
            big ? "text-base sm:text-xl" : "text-sm sm:text-base"
          }`}
        />
      </div>
    </div>
  );
}

function TripCard({
  trip,
  canDelete,
  canEdit,
  superadmin,
  today,
}: {
  trip: TripView;
  canDelete: boolean;
  canEdit: boolean;
  superadmin: boolean;
  today: string;
}) {
  const { t } = useI18n();
  const { received, spent, profit } = totals(trip.entries);

  const seedLabels: Record<string, string> = {
    "Money given": t.movements.moneyGiven,
    "Extra on the road": t.movements.extraSpending,
    Revenue: t.movements.revenue,
  };
  const labelOf = (raw: string | null) =>
    raw ? (seedLabels[raw] ?? raw) : t.movements.entryUnlabeled;
  const kindLabel: Record<ExpenseKind, string> = {
    GENERAL: t.movements.kindGeneral,
    SALARY: t.movements.kindSalary,
    CAR: t.movements.kindCar,
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Leg header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary/40">
        <div className="min-w-0">
          <p className="eyebrow">{fmt(t.movements.tripN, { n: trip.order })}</p>
          <p className="font-600 truncate">{routeOf(trip)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PairMoney
            pair={profit}
            colored
            className="font-mono tnum font-700 text-right"
          />
          {canDelete && <DeleteTrip id={trip.id} label={routeOf(trip)} />}
        </div>
      </div>

      {/* Add-entry form for this leg */}
      {canEdit && (
        <div className="p-4 border-b border-border">
          <AddEntry tripId={trip.id} today={today} />
        </div>
      )}

      {/* Entries */}
      {trip.entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">
          {t.movements.noEntries}
        </p>
      ) : (
        <ul>
          {trip.entries.map((e) => {
            const income = e.type === "RECEIVED";
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0"
              >
                <span
                  aria-hidden
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    income ? "bg-go/10 text-go" : "bg-rust/10 text-rust"
                  }`}
                >
                  {income ? (
                    <ArrowDownLeft size={16} strokeWidth={2.5} />
                  ) : (
                    <ArrowUpRight size={16} strokeWidth={2.5} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-500 truncate flex items-center gap-2">
                    {labelOf(e.label)}
                    {e.type === "SPENT" && e.kind !== "GENERAL" && (
                      <Badge variant="outline" className="shrink-0">
                        {kindLabel[e.kind]}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono tnum">{e.at}</span> ·{" "}
                    {t.movements.handledBy} {e.handledBy}
                  </p>
                  {e.hasImage && <LedgerImagePreview entryId={e.id} imageName={e.imageName} />}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`font-mono tnum font-600 whitespace-nowrap ${
                      income ? "text-go" : "text-rust"
                    }`}
                  >
                    {income ? "+" : "−"}
                    {fmtMoney(e.amount, e.currency)}
                  </span>
                  {(superadmin || canEdit) && (
                    <div className="flex gap-1.5">
                      {superadmin && <EditEntry entry={e} today={today} />}
                      {canEdit && <DeleteEntry id={e.id} />}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Leg subtotal */}
      <div className="grid grid-cols-3 border-t border-border divide-x divide-border text-xs">
        <div className="px-4 py-2">
          <span className="eyebrow !text-[0.6rem]">{t.movements.received}</span>
          <PairMoney pair={received} className="font-mono tnum text-go" />
        </div>
        <div className="px-4 py-2">
          <span className="eyebrow !text-[0.6rem]">{t.movements.spent}</span>
          <PairMoney pair={spent} className="font-mono tnum text-rust" />
        </div>
        <div className="px-4 py-2 bg-secondary/40">
          <span className="eyebrow !text-[0.6rem]">{t.movements.profit}</span>
          <PairMoney pair={profit} colored className="font-mono tnum font-600" />
        </div>
      </div>
    </div>
  );
}

function DeleteEntry({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="h-7 px-2.5 text-xs text-rust hover:text-rust"
      onClick={() =>
        start(async () => {
          const res = await deleteLedgerEntry(id);
          if (res.error) toast.error(res.error);
          else toast.success(t.movements.toastEntryDeleted);
        })
      }
    >
      {t.common.delete}
    </Button>
  );
}

function KindPicker({
  kind,
  setKind,
}: {
  kind: ExpenseKind;
  setKind: (k: ExpenseKind) => void;
}) {
  const { t } = useI18n();
  const opts: { v: ExpenseKind; label: string }[] = [
    { v: "GENERAL", label: t.movements.kindGeneral },
    { v: "SALARY", label: t.movements.kindSalary },
    { v: "CAR", label: t.movements.kindCar },
  ];
  return (
    <Segmented
      label={t.movements.category}
      value={kind}
      onChange={setKind}
      options={opts}
    />
  );
}

function CurrencyPicker({
  currency,
  setCurrency,
}: {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}) {
  const { t } = useI18n();
  const opts: { v: Currency; label: string }[] = [
    { v: "SOM", label: t.movements.curSom },
    { v: "USD", label: t.movements.curUsd },
  ];
  return (
    <Segmented
      label={t.movements.currency}
      value={currency}
      onChange={setCurrency}
      options={opts}
    />
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-md border px-2 py-1.5 text-xs font-600 transition-colors ${
              value === o.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeToggle({
  type,
  setType,
}: {
  type: "RECEIVED" | "SPENT";
  setType: (v: "RECEIVED" | "SPENT") => void;
}) {
  const { t } = useI18n();
  const income = type === "RECEIVED";
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setType("RECEIVED")}
        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-600 transition-colors ${
          income
            ? "border-go bg-go/10 text-go"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <ArrowDownLeft size={15} strokeWidth={2.5} />
        {t.movements.typeReceived}
      </button>
      <button
        type="button"
        onClick={() => setType("SPENT")}
        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-600 transition-colors ${
          !income
            ? "border-rust bg-rust/10 text-rust"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <ArrowUpRight size={15} strokeWidth={2.5} />
        {t.movements.typeSpent}
      </button>
    </div>
  );
}

function EditEntry({
  entry,
  today,
}: {
  entry: LedgerEntryView;
  today: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"RECEIVED" | "SPENT">(entry.type);
  const [kind, setKind] = useState<ExpenseKind>(entry.kind);
  const [currency, setCurrency] = useState<Currency>(entry.currency);
  const [amount, setAmount] = useState(String(entry.amount));
  const [label, setLabel] = useState(entry.label ?? "");
  const [at, setAt] = useState(entry.at || today);
  const [image, setImage] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const income = type === "RECEIVED";

  function submit() {
    if (!amount || Number(amount) <= 0) {
      toast.error(t.movements.amountNeeded);
      return;
    }
    const fd = new FormData();
    fd.set("type", type);
    fd.set("kind", type === "SPENT" ? kind : "GENERAL");
    fd.set("currency", currency);
    fd.set("amount", amount);
    fd.set("label", label);
    fd.set("at", at);
    if (image) fd.set("image", image);
    start(async () => {
      const res = await editLedgerEntry(entry.id, {}, fd);
      if (res.error) toast.error(res.error);
      else if (res.fieldErrors) toast.error(Object.values(res.fieldErrors)[0]);
      else {
        toast.success(t.movements.toastEntrySaved);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs"
        >
          {t.common.edit}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.movements.editEntry}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <TypeToggle type={type} setType={setType} />
          <CurrencyPicker currency={currency} setCurrency={setCurrency} />
          {!income && <KindPicker kind={kind} setKind={setKind} />}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editAmount">{t.movements.amount}</Label>
              <MoneyInput
                id="editAmount"
                name="editAmount"
                className="font-mono"
                defaultValue={amount}
                onRaw={setAmount}
              />
            </div>
            <div>
              <Label htmlFor="editAt">{t.common.date}</Label>
              <Input
                id="editAt"
                type="date"
                value={at}
                onChange={(e) => setAt(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="editLabel">{t.movements.entryLabel}</Label>
            <Input
              id="editLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t.movements.entryLabelPlaceholder}
            />
          </div>
          <div>
            <Label htmlFor="editImage">
              {entry.hasImage ? t.movements.replaceImage : t.movements.imageLabel}
            </Label>
            <Input
              id="editImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="cursor-pointer file:mr-3"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t.movements.imageHint}</p>
            {image ? (
              <SelectedImagePreview
                key={`${image.name}-${image.size}-${image.lastModified}`}
                file={image}
                label={t.movements.imageLabel}
              />
            ) : entry.hasImage ? (
              <LedgerImagePreview entryId={entry.id} imageName={entry.imageName} />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEntry({ tripId, today }: { tripId: string; today: string }) {
  const { t } = useI18n();
  const [type, setType] = useState<"RECEIVED" | "SPENT">("SPENT");
  const [kind, setKind] = useState<ExpenseKind>("GENERAL");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [at, setAt] = useState(today);
  const [image, setImage] = useState<File | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pending, start] = useTransition();

  function submit() {
    if (!amount || Number(amount) <= 0) {
      toast.error(t.movements.amountNeeded);
      return;
    }
    const fd = new FormData();
    fd.set("type", type);
    fd.set("kind", type === "SPENT" ? kind : "GENERAL");
    fd.set("currency", currency);
    fd.set("amount", amount);
    fd.set("label", label);
    fd.set("at", at);
    if (image) fd.set("image", image);
    start(async () => {
      const res = await addLedgerEntry(tripId, {}, fd);
      if (res.error) toast.error(res.error);
      else if (res.fieldErrors) toast.error(Object.values(res.fieldErrors)[0]);
      else {
        toast.success(t.movements.toastEntryAdded);
        setAmount("");
        setLabel("");
        setKind("GENERAL");
        setImage(null);
        setResetKey((k) => k + 1);
      }
    });
  }

  const income = type === "RECEIVED";

  return (
    <div className="space-y-4">
      <p className="eyebrow">{t.movements.addEntry}</p>
      <TypeToggle type={type} setType={setType} />
      <CurrencyPicker currency={currency} setCurrency={setCurrency} />
      {!income && <KindPicker kind={kind} setKind={setKind} />}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`amt-${tripId}`}>{t.movements.amount}</Label>
          <MoneyInput
            key={resetKey}
            id={`amt-${tripId}`}
            name="amount"
            className="font-mono"
            onRaw={setAmount}
          />
        </div>
        <div>
          <Label htmlFor={`at-${tripId}`}>{t.common.date}</Label>
          <Input
            id={`at-${tripId}`}
            type="date"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`lbl-${tripId}`}>{t.movements.entryLabel}</Label>
        <Input
          id={`lbl-${tripId}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.movements.entryLabelPlaceholder}
        />
      </div>
      <div>
        <Label htmlFor={`img-${tripId}`} className="flex items-center gap-1.5">
          <ImageIcon className="size-4 text-muted-foreground" />
          {t.movements.imageLabel}
        </Label>
        <Input
          key={`image-${resetKey}`}
          id={`img-${tripId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          className="cursor-pointer file:mr-3"
        />
        <p className="mt-1 text-xs text-muted-foreground">{t.movements.imageHint}</p>
        {image && (
          <SelectedImagePreview
            key={`${image.name}-${image.size}-${image.lastModified}`}
            file={image}
            label={t.movements.imageLabel}
          />
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? t.movements.adding : t.movements.add}
        </Button>
      </div>
    </div>
  );
}

function NewTrip({
  movementId,
  defaultOrigin,
}: {
  movementId: string;
  defaultOrigin: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!destination.trim()) {
      toast.error(t.movements.toPlaceholder);
      return;
    }
    const fd = new FormData();
    fd.set("origin", origin);
    fd.set("destination", destination);
    start(async () => {
      const res = await addTrip(movementId, {}, fd);
      if (res.error) toast.error(res.error);
      else if (res.fieldErrors) toast.error(Object.values(res.fieldErrors)[0]);
      else {
        toast.success(t.movements.toastTripAdded);
        setOpen(false);
        setDestination("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setOrigin(defaultOrigin);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <Plus size={16} /> {t.movements.newTrip}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.movements.newTrip}</DialogTitle>
          <DialogDescription>{t.movements.newTripDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tripFrom">{t.movements.fromOptional}</Label>
            <Input
              id="tripFrom"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={t.movements.fromPlaceholder}
            />
          </div>
          <div>
            <Label htmlFor="tripTo">{t.movements.to}</Label>
            <Input
              id="tripTo"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t.movements.toPlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? t.movements.adding : t.movements.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTrip({ id, label }: { id: string; label: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs text-rust hover:text-rust"
        >
          {t.common.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.movements.deleteTripTitle}</DialogTitle>
          <DialogDescription>
            {label}. {t.movements.deleteTripDesc}
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
                const res = await deleteTrip(id);
                if (res.error) toast.error(res.error);
                else {
                  toast.success(t.movements.toastTripDeleted);
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

function EndTrip({ movementId }: { movementId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t.movements.endTrip}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.movements.endConfirmTitle}</DialogTitle>
          <DialogDescription>{t.movements.endConfirmDesc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await endMovement(movementId);
                if (res.error) toast.error(res.error);
                else {
                  toast.success(t.movements.toastEnded);
                  setOpen(false);
                }
              })
            }
          >
            {t.movements.endTrip}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenTrip({ movementId }: { movementId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reopenMovement(movementId);
          if (res.error) toast.error(res.error);
          else toast.success(t.movements.toastReopened);
        })
      }
    >
      {t.movements.reopen}
    </Button>
  );
}
