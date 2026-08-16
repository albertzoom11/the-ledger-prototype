import type { AccessPolicy, PermissionGroup } from "./access";
import { requirePermission, type Actor } from "./actor";
import { listUsers, type UserRecord } from "./users";

/**
 * Read-side of access control. Listing the directory and the permission matrix
 * is itself an administrative capability, so it is gated in the service rather
 * than by hiding the page or checking inside the screen component.
 */

export interface AccessOverview {
  users: UserRecord[];
  groups: readonly PermissionGroup[];
}

export function getAccessOverview(
  actor: Actor,
  policy: AccessPolicy,
): AccessOverview {
  requirePermission(actor, "admin:access");
  return { users: listUsers(), groups: policy.groups };
}
