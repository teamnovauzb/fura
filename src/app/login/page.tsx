import type { Metadata } from "next";
import { Truck, ShieldCheck, ScrollText, Wallet } from "lucide-react";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Fura",
};

export default async function LoginPage() {
  const { t } = await getT();

  const chips = [
    { icon: ShieldCheck, label: t.login.chipSecure },
    { icon: ScrollText, label: t.login.chipAudit },
    { icon: Wallet, label: t.login.chipMoney },
  ];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-xl ring-1 ring-border bg-card min-h-[34rem]">
        {/* Hero panel */}
        <aside className="relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden">
          {/* Truck photo + navy/blue overlay for legibility */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/truck.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-sidebar/95 via-sidebar/85 to-primary/70" />

          <div className="relative flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-white/15 backdrop-blur">
              <Truck className="size-5" />
            </span>
            <span className="font-mono text-lg font-700 tracking-[0.2em]">
              {t.common.appName}
            </span>
          </div>

          <div className="relative space-y-6 max-w-sm">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/60">
              {t.login.tagline}
            </p>
            <h1 className="font-800 text-4xl leading-[1.08]">
              {t.login.heroTitle1}
              <br />
              {t.login.heroTitle2}
            </h1>
            <p className="text-white/70 leading-relaxed text-sm">
              {t.login.heroBody}
            </p>

            <div className="flex gap-3 pt-2">
              {chips.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-2 w-20 text-center">
                  <span className="grid place-items-center size-11 rounded-xl bg-white/10 ring-1 ring-white/15">
                    <c.icon className="size-5" />
                  </span>
                  <span className="text-[0.7rem] leading-tight text-white/75">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2 rounded-lg bg-white/10 ring-1 ring-white/10 px-4 py-3 text-sm text-white/80">
            <ShieldCheck className="size-4 shrink-0 text-[var(--amber)]" />
            {t.login.trusted}
          </div>
        </aside>

        {/* Form panel */}
        <section className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-8">
            <div className="lg:hidden flex items-center gap-2.5">
              <span className="grid place-items-center size-9 rounded-xl bg-primary text-primary-foreground">
                <Truck className="size-5" />
              </span>
              <span className="font-mono text-base font-700 tracking-[0.2em]">
                {t.common.appName}
              </span>
            </div>
            <LanguageSwitcher variant="light" className="ml-auto" />
          </div>

          <div className="space-y-2 mb-7">
            <h2 className="text-3xl font-800">{t.login.welcomeBack}</h2>
            <p className="text-muted-foreground text-sm">{t.login.welcomeSub}</p>
          </div>

          <LoginForm />

          <p className="mt-8 text-sm text-muted-foreground">
            {t.login.noAccount}{" "}
            <span className="text-primary font-600">{t.login.contactAdmin}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
