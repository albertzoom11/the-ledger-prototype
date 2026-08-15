/**
 * Ledger platform: roles and permissions.
 *
 * Permissions are the only thing business logic checks. Roles are just bundles
 * of permissions, so adding a new internal application means adding permission
 * strings here and granting them, not touching call sites.
 */

export const ROLES = ["REVIEWER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "refunds:view",
  "refunds:decide",
  "refunds:decide_high_value",
  "audit:view",
  "admin:access",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  REVIEWER: ["refunds:view", "refunds:decide"],
  ADMIN: [
    "refunds:view",
    "refunds:decide",
    "refunds:decide_high_value",
    "audit:view",
    "admin:access",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  REVIEWER: "Reviewer",
  ADMIN: "Admin",
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
