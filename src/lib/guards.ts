import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

/**
 * Require any authenticated user. Redirects to /login otherwise.
 * Use at the top of every protected page and server action.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

/**
 * Require the superadmin. This is the real authorization boundary —
 * never rely on the UI hiding a button. Every privileged mutation
 * (edit/delete transactions, manage users, view audit log) calls this.
 */
export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPERADMIN") {
    // Server actions throw; pages redirect. Throwing is safe in both
    // because Next surfaces it as an error boundary, but for pages we
    // prefer a clean redirect to the dashboard.
    redirect("/?error=forbidden");
  }
  return user;
}

export function isSuperadmin(user: { role: Role } | null | undefined): boolean {
  return user?.role === "SUPERADMIN";
}

/** Throwing variant for use inside server actions. */
export async function assertSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPERADMIN") {
    throw new Error("Forbidden: this action requires superadmin.");
  }
  return user;
}
