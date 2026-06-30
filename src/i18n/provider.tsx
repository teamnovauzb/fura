"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

type I18nValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  pending: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [pending, startTransition] = useTransition();

  // Both dictionaries are bundled, so the client swap is instant. Once the
  // server re-renders with the new cookie, `dictionary` matches again.
  const t = locale === initialLocale ? dictionary : getDictionary(locale);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      setLocaleState(next); // instant: client components re-render now
      startTransition(() => router.refresh()); // background: server text catches up
    },
    [locale, router],
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, pending }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Client-side translations: `const { t, locale, setLocale } = useI18n();` */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
