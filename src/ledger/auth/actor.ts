import { Role, Permission, roleHasPermission } from "./roles";

/**
 * An Actor is whoever is performing an action. In production this comes from
 * the identity provider; in the prototype it comes from a cookie. Everything
 * downstream (services, audit log) only depends on this shape.
 */
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
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
  return roleHasPermission(actor.role, permission);
}

/** Server-side authorization gate. Business actions call this, never the UI. */
export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError(permission, actor);
}
