export const locales = ["uz", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uz";
export const LOCALE_COOKIE = "lang";

export const localeNames: Record<Locale, string> = {
  uz: "Ўзбекча",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Tiny interpolation: fmt("Салом, {name}", { name }) → "Салом, Ali". */
export function fmt(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] === undefined ? "" : String(vars[key]),
  );
}
