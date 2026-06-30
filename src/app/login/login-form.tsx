"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import { authenticate } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" className="w-full h-11 text-base" disabled={pending}>
      {pending ? t.login.signingIn : t.common.signIn}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction] = useActionState(authenticate, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t.login.usernameOrEmail}</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="superadmin"
            className="h-11 pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t.login.password}</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
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
