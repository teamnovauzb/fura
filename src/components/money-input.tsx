"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** Keep only digits and a single dot, max 2 decimals. */
function clean(input: string): string {
  let s = input.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    const intPart = s.slice(0, dot);
    const decPart = s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
    s = `${intPart}.${decPart}`;
  }
  return s;
}

/** Group the integer part with spaces every 3 digits: 1000000 → "1 000 000". */
function display(raw: string): string {
  if (raw === "") return "";
  const [intRaw, dec] = raw.split(".");
  let int = intRaw.replace(/^0+(?=\d)/, "");
  if (int === "") int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

/**
 * Money field that shows space-grouped thousands as you type ("1 000 000").
 * The submitted form value carries the spaces; the server's validation strips
 * them. `onRaw` reports the un-spaced numeric string for live calculations.
 */
export function MoneyInput({
  name,
  id,
  defaultValue,
  placeholder = "0",
  required,
  className,
  onRaw,
}: {
  name: string;
  id?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onRaw?: (raw: string) => void;
}) {
  const initial = defaultValue != null ? clean(String(defaultValue)) : "";
  const [value, setValue] = useState(display(initial));

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const raw = clean(e.target.value);
        setValue(display(raw));
        onRaw?.(raw);
      }}
    />
  );
}
