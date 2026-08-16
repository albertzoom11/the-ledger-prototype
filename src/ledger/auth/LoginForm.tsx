"use client";

import { useActionState } from "react";
import { Field, FormError, Input } from "../ui/form";
import { signIn, type SignInState } from "./authActions";

const initialState: SignInState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded border border-line bg-surface p-4"
    >
      <div>
        <h1 className="text-[15px] font-semibold text-ink">Sign in</h1>
        <p className="text-[12px] text-muted">
          Use your Ledger operations account.
        </p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" required>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="you@ledger.example"
          invalid={state.status === "error"}
        />
      </Field>

      <Field label="Password" required>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={state.status === "error"}
        />
      </Field>

      {state.status === "error" && <FormError message={state.message} />}

      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded bg-ink text-[13px] font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[11px] leading-snug text-muted">
        Prototype authentication: passwords are scrypt-hashed and sessions are
        stored server-side. Seeded demo accounts and their password are listed in
        the README.
      </p>
    </form>
  );
}
