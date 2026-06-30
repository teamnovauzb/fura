"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import { authenticate } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? t.login.signingIn : t.common.signIn}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t.login.usernameOrEmail}</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          placeholder="superadmin"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.login.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="text-sm text-destructive border-l-2 border-destructive pl-3"
        >
          {state.error === "invalid" ? t.login.wrongCreds : state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
