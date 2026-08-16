import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor } from "./actor";
import { safeNextPath } from "./redirects";
import { REQUESTED_PATH_HEADER, SESSION_COOKIE } from "./sessionCookie";
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

/**
 * Server-side gate for any authenticated surface. A caller can name the page to
 * come back to; otherwise the requested path recorded by middleware is used, so
 * an expired or forged session keeps its deep link instead of landing on a bare
 * login page. Either way the target goes through `safeNextPath()`, since the
 * header is ultimately client-supplied.
 */
export async function requireActor(returnTo?: string): Promise<Actor> {
  const actor = await getCurrentActor();
  if (actor) return actor;

  const requested = returnTo ?? (await headers()).get(REQUESTED_PATH_HEADER);
  redirect(`/login?next=${encodeURIComponent(safeNextPath(requested))}`);
}
