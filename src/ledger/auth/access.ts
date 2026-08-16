import type { Role } from "./roles";

/**
 * Ledger platform: the access policy.
 *
 * The platform owns roles and the *shape* of a permission; each installed
 * application owns the permission strings it needs and says which roles get
 * them. `buildAccessPolicy` merges those declarations into the single map that
 * `can()` / `requirePermission()` consult, so the platform never has to know
 * that refunds — or any other application — exists.
 */

/** Convention: `<app>:<capability>`, e.g. `refunds:decide`, `audit:view`. */
export type Permission = `${string}:${string}`;

export interface PermissionDefinition {
  key: Permission;
  /** Shown in the permission matrix at /admin/access. */
  description: string;
  grantedTo: readonly Role[];
}

export interface PermissionGroup {
  /** Application key the permissions belong to. */
  key: string;
  name: string;
  permissions: readonly PermissionDefinition[];
}

export interface AccessPolicy {
  groups: readonly PermissionGroup[];
  all: readonly PermissionDefinition[];
  permissionsFor(role: Role): readonly Permission[];
  isRegistered(permission: Permission): boolean;
}

export function buildAccessPolicy(
  groups: readonly PermissionGroup[],
): AccessPolicy {
  const all = groups.flatMap((group) => group.permissions);

  const duplicate = all.find(
    (definition, index) =>
      all.findIndex((other) => other.key === definition.key) !== index,
  );
  if (duplicate) {
    throw new Error(
      `Permission "${duplicate.key}" is declared by more than one application`,
    );
  }

  const byRole = new Map<Role, Permission[]>();
  for (const definition of all) {
    for (const role of definition.grantedTo) {
      const granted = byRole.get(role) ?? [];
      granted.push(definition.key);
      byRole.set(role, granted);
    }
  }

  return {
    groups,
    all,
    permissionsFor: (role) => byRole.get(role) ?? [],
    isRegistered: (permission) =>
      all.some((definition) => definition.key === permission),
  };
}
