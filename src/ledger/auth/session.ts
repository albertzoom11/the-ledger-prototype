import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor } from "./actor";
import { SESSION_COOKIE } from "./sessionCookie";
import { actorForSessionToken } from "./sessionStore";

/**
 * Ledger platform: request identity.
 *
 * The signed-in actor is resolved from a server-side session on every request;
 * the cookie itself carries no identity or role, only an opaque token. Service
 * and UI code never reads the cookie — they take the Actor from here.
 */

export async function getCurrentActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return actorForSessionToken(token);
}

/** Server-side gate for any authenticated surface. */
export async function requireActor(returnTo?: string): Promise<Actor> {
  const actor = await getCurrentActor();
  if (actor) return actor;
  const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
  redirect(target);
}
