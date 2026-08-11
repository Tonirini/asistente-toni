"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <form action={formAction} className="w-full max-w-xs space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Asistente Toni
          </h1>
          <p className="text-sm text-muted-foreground">Ingresá tu PIN</p>
        </div>

        <Input
          name="pin"
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          maxLength={12}
          className="h-12 text-center text-lg tracking-widest"
          placeholder="••••"
        />

        {state.error && (
          <p className="text-center text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" className="h-12 w-full" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
