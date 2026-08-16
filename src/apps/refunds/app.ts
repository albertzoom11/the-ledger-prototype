import type { LedgerApp } from "@/ledger/apps/registry";
import { ensureRefundsSchema } from "./data/schema";

/**
 * The refunds application's manifest: everything the Ledger platform needs to
 * know about this application, and the only file the platform reads directly.
 *
 * Refund permission strings are declared here (not in platform code) together
 * with the roles that receive them.
 */

export const REFUND_PERMISSIONS = {
  view: "refunds:view",
  decide: "refunds:decide",
  decideHighValue: "refunds:decide_high_value",
} as const;

export const refundsApp: LedgerApp = {
  key: "refunds",
  name: "Operations",
  install: ensureRefundsSchema,
  nav: [
    {
      label: "Refund Queue",
      href: "/refunds",
      match: "/refunds",
      permission: REFUND_PERMISSIONS.view,
      description: "Review and decide customer refund requests",
    },
  ],
  permissions: [
    {
      key: REFUND_PERMISSIONS.view,
      description: "Read the refund queue and refund detail",
      grantedTo: ["REVIEWER", "ADMIN"],
    },
    {
      key: REFUND_PERMISSIONS.decide,
      description: "Approve, reject or escalate a refund",
      grantedTo: ["REVIEWER", "ADMIN"],
    },
    {
      key: REFUND_PERMISSIONS.decideHighValue,
      description: "Approve refunds of $500.00 or more",
      grantedTo: ["ADMIN"],
    },
  ],
};
