import { buildAccessPolicy } from "@/ledger/auth/access";
import type { Actor } from "@/ledger/auth/actor";
import { getCurrentUser, requireUser } from "@/ledger/auth/session";
import { toActor } from "@/ledger/auth/users";
import { permissionGroupsFor } from "@/ledger/apps/registry";
import { INSTALLED_APPS } from "./apps";

/**
 * Composition root: the access policy of this deployment, merged from the
 * permissions declared by every installed application. This is where a signed-in
 * user becomes an Actor — identity comes from the platform session, capability
 * comes from the installed applications.
 */
export const accessPolicy = buildAccessPolicy(
  permissionGroupsFor(INSTALLED_APPS),
);

/** The signed-in actor, or null when there is no valid session. */
export async function getActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  return user ? toActor(user, accessPolicy) : null;
}

/** As above, but redirects to the login page (keeping `returnTo`) instead. */
export async function requireActor(returnTo?: string): Promise<Actor> {
  return toActor(await requireUser(returnTo), accessPolicy);
}
