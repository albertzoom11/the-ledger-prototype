import { cookies } from "next/headers";
import type { AccessPolicy } from "./access";
import type { Actor } from "./actor";
import { findUser, listUsers, toActor } from "./users";

/**
 * Prototype identity: the "signed-in" actor is stored in a cookie and resolved
 * on the server on every request. Replacing this file with an OIDC/SSO session
 * lookup is the only change needed to make identity real — no service or UI
 * code reads the cookie directly.
 *
 * The access policy is passed in rather than imported, because the set of
 * permissions depends on which applications are installed (see
 * `src/platform/access.ts`).
 */

export const ACTOR_COOKIE = "ledger_actor";

export async function resolveActor(policy: AccessPolicy): Promise<Actor> {
  const store = await cookies();
  const id = store.get(ACTOR_COOKIE)?.value;
  const user = id ? findUser(id) : null;
  if (user) return toActor(user, policy);

  const fallback =
    listUsers().find((candidate) => candidate.role === "REVIEWER") ??
    listUsers()[0];
  if (!fallback) {
    throw new Error(
      "No users found. Run `npm run seed` to populate the Ledger database.",
    );
  }
  return toActor(fallback, policy);
}
