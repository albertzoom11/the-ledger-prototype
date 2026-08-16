import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "./redirects";
import { REQUESTED_PATH_HEADER, SESSION_COOKIE } from "./sessionCookie";
import { userForSessionToken } from "./sessionStore";
import type { UserRecord } from "./users";

/**
 * Ledger platform: request identity.
 *
 * The signed-in user is resolved from a server-side session on every request;
 * the cookie itself carries no identity or role, only an opaque token. What
 * that user may *do* is not decided here: the composition root turns the user
 * into an Actor by resolving the permissions its role has been granted by the
 * installed applications (see `src/platform/access.ts`).
 */

export async function getCurrentUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForSessionToken(token);
}

/**
 * Server-side gate for any authenticated surface. A caller can name the page to
 * come back to; otherwise the requested path recorded by middleware is used, so
 * an expired or forged session keeps its deep link instead of landing on a bare
 * login page. Either way the target goes through `safeNextPath()`, since the
 * header is ultimately client-supplied.
 */
export async function requireUser(returnTo?: string): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (user) return user;

  const requested = returnTo ?? (await headers()).get(REQUESTED_PATH_HEADER);
  redirect(`/login?next=${encodeURIComponent(safeNextPath(requested))}`);
}
