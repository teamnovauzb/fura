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
  extraSpending: money,
  revenue: optionalMoney,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  movedAt: z.string().optional(),
});

export const newUserSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  email: z.string().trim().toLowerCase().email("validEmail"),
  password: z.string().min(8, "passwordMin").max(200),
  role: z.enum(["SUPERADMIN", "ADMIN"]),
});

export type TruckInput = z.infer<typeof truckSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type NewUserInput = z.infer<typeof newUserSchema>;
