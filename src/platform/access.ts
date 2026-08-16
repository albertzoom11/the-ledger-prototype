import { buildAccessPolicy } from "@/ledger/auth/access";
import type { Actor } from "@/ledger/auth/actor";
import { resolveActor } from "@/ledger/auth/session";
import { permissionGroupsFor } from "@/ledger/apps/registry";
import { INSTALLED_APPS } from "./apps";

/**
 * Composition root: the access policy of this deployment, merged from the
 * permissions declared by every installed application.
 */
export const accessPolicy = buildAccessPolicy(
  permissionGroupsFor(INSTALLED_APPS),
);

/** The signed-in actor, with the permissions of this deployment resolved. */
export function getActor(): Promise<Actor> {
  return resolveActor(accessPolicy);
}
