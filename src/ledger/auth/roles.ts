/**
 * Ledger platform: roles.
 *
 * Roles are platform-wide and deliberately few. What a role may *do* is not
 * defined here — each application declares its own permissions and the roles
 * that receive them (see `access.ts` and the app manifests), so adding an
 * internal application never means editing platform code.
 */

export const ROLES = ["REVIEWER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  REVIEWER: "Reviewer",
  ADMIN: "Admin",
};
