import { installApps } from "@/ledger/apps/registry";
import { INSTALLED_APPS } from "./apps";

/**
 * Composition root, part two: give each installed application the chance to
 * create its own tables before anything serves a request. The platform schema
 * (identity, audit) is created by `getDb()`; application schemas are installed
 * here, so ordering is explicit rather than accidental.
 */

let bootstrapped = false;

export function bootstrapLedger(): void {
  if (bootstrapped) return;
  installApps(INSTALLED_APPS);
  bootstrapped = true;
}
