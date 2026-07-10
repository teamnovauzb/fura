import { z } from "zod";

// Messages are dictionary CODES (see Dictionary["errors"]) so server actions
// can localize them with the active locale.
// Inputs arrive space-grouped ("1 000 000"); strip spaces (incl. NBSP) and
// accept a comma decimal before coercing to a number.
const money = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v.replace(/[\s ]/g, "").replace(",", ".")
      : v,
  z.coerce
    .number({ error: "enterNumber" })
    .nonnegative("negative")
    .max(9_999_999_999, "tooLarge")
    .transform((n) => Math.round(n * 100) / 100),
);

const optionalMoney = z
  .union([z.literal(""), money])
  .transform((v) => (v === "" ? null : v))
  .nullable();

// Optional money that defaults to 0 when left blank (kept non-null for sums).
const optionalMoneyZero = z
  .union([z.literal(""), money])
  .transform((v) => (v === "" ? 0 : v));

export const truckSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  plate: z.string().trim().max(40).optional().or(z.literal("")),
  price: money,
});

export const driverSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  truckId: z.string().min(1, "pickTruck"),
  driverId: z.string().min(1, "pickDriver"),
  origin: z.string().trim().max(160).optional().or(z.literal("")),
  destination: z.string().trim().min(1, "destinationRequired").max(160),
  moneyGiven: money,
  extraSpending: optionalMoneyZero,
  revenue: optionalMoney,
  // Currency for the movement's seed money (given / extra / revenue).
  currency: z.enum(["SOM", "USD"]).optional().default("USD"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  movedAt: z.string().optional(),
});

// A single ledger line added to an open movement: money in or out.
// `kind` categorises a SPENT entry (general cost, salary, or car spending).
export const ledgerEntrySchema = z.object({
  type: z.enum(["RECEIVED", "SPENT"]),
  kind: z.enum(["GENERAL", "SALARY", "CAR"]).optional().default("GENERAL"),
  currency: z.enum(["SOM", "USD"]).optional().default("USD"),
  amount: money,
  label: z.string().trim().max(160).optional().or(z.literal("")),
  at: z.string().optional(),
});

// A yyyy-mm-dd string from an <input type="date">.
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "pickDate");

export const reminderSchema = z.object({
  truckId: z.string().min(1, "pickTruck"),
  title: z.string().trim().min(1, "titleRequired").max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  dueDate: dateOnly,
});

export const rescheduleSchema = z.object({
  dueDate: dateOnly,
});

export const newUserSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  // A login is a plain username (email is allowed but not required).
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "loginMin")
    .max(60)
    .regex(/^[a-z0-9._@+-]+$/, "loginInvalid"),
  password: z.string().min(8, "passwordMin").max(200),
  role: z.enum(["SUPERADMIN", "ADMIN"]),
});

export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type TruckInput = z.infer<typeof truckSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type NewUserInput = z.infer<typeof newUserSchema>;
