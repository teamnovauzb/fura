import { requireUser, isSuperadmin } from "@/lib/guards";
import { countDueReminders } from "@/lib/reminders";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { LogOut, Sparkles } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();
  const dueReminders = await countDueReminders();

  const items: NavItem[] = [
    { href: "/", label: t.nav.dashboard, code: "00" },
    { href: "/movements", label: t.nav.movements, code: "01" },
    { href: "/finance", label: t.nav.finance, code: "02" },
    { href: "/som-kassa", label: t.nav.somKassa, code: "08" },
    { href: "/trucks", label: t.nav.trucks, code: "03" },
    { href: "/drivers", label: t.nav.drivers, code: "04" },
    {
      href: "/reminders",
      label: t.nav.reminders,
      code: "05",
      badge: dueReminders || undefined,
    },
    ...(superadmin ? [{ href: "/staff", label: t.nav.staff, code: "06" }] : []),
    { href: "/closed-movements", label: t.nav.closedMovements, code: "09" },
    ...(superadmin ? [{ href: "/audit", label: t.nav.audit, code: "07" }] : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <NotificationCenter />
      {/* Dispatch rail */}
      <aside className="hidden md:flex sticky top-0 h-screen w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border/70">
        <div className="flex items-center gap-3 px-6 h-20">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10"><Sparkles className="size-5" /></span>
          <span className="text-lg font-800 tracking-[0.16em] text-sidebar-accent-foreground">
            {t.common.appName}
          </span>
        </div>

        <div className="flex-1 px-4 py-4">
          <p className="eyebrow px-3 mb-3 text-sidebar-foreground/40">
            {t.nav.ledger}
          </p>
          <SidebarNav items={items} />
        </div>

        <div className="m-3 rounded-2xl bg-sidebar-accent/60 p-3 space-y-3">
          <div>
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="px-1">
            <p className="text-sm font-600 text-sidebar-accent-foreground truncate">
              {user.name ?? user.email}
            </p>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-amber">
              {superadmin ? t.roles.superadmin : t.roles.admin}
            </p>
          </div>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-400 hover:bg-red-500/15 hover:text-red-300"
            >
              <LogOut className="size-4" />
              {t.common.signOut}
            </Button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Sparkles className="size-[18px]" /></span>
            <span className="font-800 tracking-[0.16em]">
              {t.common.appName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label={t.common.signOut} className="text-red-400 hover:bg-red-500/15 hover:text-red-300">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        {/* Mobile nav strip */}
        <MobileNav items={items} />

        <main className="flex-1 p-4 pb-10 sm:p-8 lg:p-10 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
