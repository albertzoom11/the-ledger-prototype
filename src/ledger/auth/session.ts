import { cookies } from "next/headers";
import type { Actor } from "./actor";
import { findUser, listUsers } from "./users";

/**
 * Prototype identity: the "signed-in" actor is stored in a cookie and resolved
 * on the server on every request. Replacing this file with an OIDC/SSO session
 * lookup is the only change needed to make identity real — no service or UI
 * code reads the cookie directly.
 */

export const ACTOR_COOKIE = "ledger_actor";

export async function getCurrentActor(): Promise<Actor> {
  const store = await cookies();
  const id = store.get(ACTOR_COOKIE)?.value;
  const actor = id ? findUser(id) : null;
  if (actor) return actor;

  const fallback =
    listUsers().find((user) => user.role === "REVIEWER") ?? listUsers()[0];
  if (!fallback) {
    throw new Error(
      "No users found. Run `npm run seed` to populate the Ledger database.",
    );
  }
  return fallback;
}
