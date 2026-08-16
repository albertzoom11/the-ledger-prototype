import type { PermissionDefinition, PermissionGroup } from "../auth/access";
import { can, type Actor } from "../auth/actor";

/**
 * Ledger platform: the application registry.
 *
 * An internal application describes itself to the platform with one manifest:
 * a name, the navigation it contributes, and the permissions it defines. The
 * shell, the permission-filtered sidebar and the access-control matrix are all
 * derived from these manifests, which is why installing a second application is
 * an edit to `src/platform/apps.ts` and nothing else.
 */

export interface LedgerNavItem {
  label: string;
  href: string;
  /** Matches nested routes, e.g. /refunds/rf_123. */
  match: string;
  permission?: PermissionDefinition["key"];
  description?: string;
}

export interface LedgerApp {
  key: string;
  /** Sidebar group heading, e.g. "Operations". */
  name: string;
  nav: LedgerNavItem[];
  permissions: readonly PermissionDefinition[];
  /**
   * Installs whatever the application needs before it serves a request — in
   * practice its own tables. Must be idempotent; the platform calls it once per
   * process (see `src/platform/bootstrap.ts`).
   */
  install?: () => void;
}

export interface NavGroup {
  key: string;
  name: string;
  items: LedgerNavItem[];
}

/** Nav for one actor: apps contribute items, permissions decide visibility. */
export function navGroupsFor(
  apps: readonly LedgerApp[],
  actor: Actor,
): NavGroup[] {
  return apps
    .map((app) => ({
      key: app.key,
      name: app.name,
      items: app.nav.filter(
        (item) => !item.permission || can(actor, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Runs each installed application's setup. Idempotent per process. */
export function installApps(apps: readonly LedgerApp[]): void {
  for (const app of apps) app.install?.();
}

export function permissionGroupsFor(
  apps: readonly LedgerApp[],
): PermissionGroup[] {
  return apps
    .filter((app) => app.permissions.length > 0)
    .map((app) => ({
      key: app.key,
      name: app.name,
      permissions: app.permissions,
    }));
}
