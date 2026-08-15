import type { Permission } from "../auth/roles";

/**
 * Ledger platform: the platform-level registry of internal applications.
 *
 * Adding a second internal tool means appending an entry here; the shell, the
 * sidebar and the permission-aware nav filtering all follow automatically.
 */

export interface LedgerNavItem {
  label: string;
  href: string;
  /** Matches nested routes, e.g. /refunds/rf_123. */
  match: string;
  permission?: Permission;
  description?: string;
}

export interface LedgerAppRegistration {
  key: string;
  name: string;
  items: LedgerNavItem[];
}

export const LEDGER_APPS: LedgerAppRegistration[] = [
  {
    key: "operations",
    name: "Operations",
    items: [
      {
        label: "Refund Queue",
        href: "/refunds",
        match: "/refunds",
        permission: "refunds:view",
        description: "Review and decide customer refund requests",
      },
    ],
  },
  {
    key: "platform",
    name: "Platform",
    items: [
      {
        label: "Audit Log",
        href: "/admin/audit",
        match: "/admin/audit",
        permission: "audit:view",
        description: "Every state transition across every Ledger application",
      },
      {
        label: "Access Control",
        href: "/admin/access",
        match: "/admin/access",
        permission: "admin:access",
        description: "Roles and permission grants",
      },
    ],
  },
];
