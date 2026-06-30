import type { ZodError } from "zod";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Turn a ZodError into `{ field: message }`, translating each issue's code
 * (e.g. "nameRequired") through the active locale's `errors` dictionary.
 */
export function fieldErrorsFrom(
  error: ZodError,
  errors: Dictionary["errors"],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) {
      const code = issue.message as keyof Dictionary["errors"];
      out[key] = errors[code] ?? issue.message;
    }
  }
  return out;
}
