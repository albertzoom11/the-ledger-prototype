import type { Permission } from "./access";
import type { Role } from "./roles";

/**
 * An Actor is whoever is performing an action. In production this comes from
 * the identity provider; here it comes from a server-side session. Everything
 * downstream (services, audit log) only depends on this shape.
 *
 * The actor's permissions are resolved once, from the access policy, when the
 * session is resolved — so authorization checks are pure list membership and
 * business logic never has to reach for a global role table.
 */
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: readonly Permission[];
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(
    readonly permission: Permission,
    readonly actor: Actor,
  ) {
    super(
      `${actor.name} (${actor.role}) is not permitted to perform "${permission}"`,
    );
    this.name = "ForbiddenError";
  }
}

export function can(actor: Actor, permission: Permission): boolean {
  return actor.permissions.includes(permission);
}

/** Server-side authorization gate. Business actions call this, never the UI. */
export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError(permission, actor);
}
