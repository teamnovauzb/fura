import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Fura",
};

export default async function LoginPage() {
  const { t } = await getT();

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Asphalt panel — the dispatch rail identity */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12 overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="lane-mark h-7 w-3 rounded-[2px]" />
          <span className="font-mono text-lg font-700 tracking-[0.2em] text-sidebar-accent-foreground">
            {t.common.appName}
          </span>
        </div>

        <div className="space-y-6 max-w-md">
          <p className="eyebrow text-amber">{t.login.tagline}</p>
          <h1 className="font-800 text-4xl leading-[1.05] text-sidebar-accent-foreground">
            {t.login.heroTitle1}
            <br />
            {t.login.heroTitle2}
          </h1>
          <p className="text-sidebar-foreground/80 leading-relaxed">
            {t.login.heroBody}
          </p>
          <div className="road-line w-48" />
        </div>

        <p className="font-mono text-xs text-sidebar-foreground/50">
          {t.login.authorizedOnly}
        </p>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-3">
              <span className="lane-mark h-7 w-3 rounded-[2px]" />
              <span className="font-mono text-lg font-700 tracking-[0.2em]">
                {t.common.appName}
              </span>
            </div>
            <LanguageSwitcher variant="light" className="ml-auto" />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">{t.login.signInEyebrow}</p>
            <h2 className="text-2xl font-700">{t.login.welcomeBack}</h2>
            <p className="text-muted-foreground text-sm">{t.login.welcomeSub}</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
