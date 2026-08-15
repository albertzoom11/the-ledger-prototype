"use client";

import { useTransition } from "react";
import { signOut } from "../auth/authActions";

/** Ends the server-side session; the cookie alone cannot be reused afterwards. */
export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => void signOut())}
      className="h-7 rounded border border-line px-2 text-[12px] text-ink hover:bg-canvas disabled:opacity-60"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
