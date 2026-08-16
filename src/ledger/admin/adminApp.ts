import type { LedgerApp } from "../apps/registry";

/**
 * The platform's own administrative application. It is registered exactly the
 * way a business application is — same manifest shape, same permission
 * declarations — so there is no privileged special case in the shell.
 */
export const LEDGER_ADMIN_APP: LedgerApp = {
  key: "platform",
  name: "Platform",
  nav: [
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
  permissions: [
    {
      key: "audit:view",
      description: "Read the platform-wide audit log",
      grantedTo: ["ADMIN"],
    },
    {
      key: "admin:access",
      description: "Inspect roles and permission grants",
      grantedTo: ["ADMIN"],
    },
  ],
};
