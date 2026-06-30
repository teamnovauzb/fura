import { requireUser, isSuperadmin } from "@/lib/guards";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const superadmin = isSuperadmin(user);
  const { t } = await getT();

  const items: NavItem[] = [
    { href: "/", label: t.nav.dashboard, code: "00" },
    { href: "/movements", label: t.nav.movements, code: "01" },
    { href: "/trucks", label: t.nav.trucks, code: "02" },
    { href: "/drivers", label: t.nav.drivers, code: "03" },
    ...(superadmin
      ? [
          { href: "/staff", label: t.nav.staff, code: "04" },
          { href: "/audit", label: t.nav.audit, code: "05" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Dispatch rail */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <span className="lane-mark h-6 w-2.5 rounded-[2px]" />
          <span className="font-mono text-base font-700 tracking-[0.2em] text-sidebar-accent-foreground">
            {t.common.appName}
          </span>
        </div>

        <div className="flex-1 px-3 py-5">
          <p className="eyebrow px-4 mb-3 text-sidebar-foreground/40">
            {t.nav.ledger}
          </p>
          <SidebarNav items={items} />
        </div>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
          <div className="px-3">
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="px-3">
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
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
            >
              {t.common.signOut}
            </Button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <span className="lane-mark h-5 w-2 rounded-[2px]" />
            <span className="font-mono font-700 tracking-[0.2em]">
              {t.common.appName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm" className="text-sidebar-foreground/80">
                {t.common.signOut}
              </Button>
            </form>
          </div>
        </header>

        {/* Mobile nav strip */}
        <MobileNav items={items} />

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
