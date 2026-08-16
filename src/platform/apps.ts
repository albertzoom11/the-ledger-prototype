import { LEDGER_ADMIN_APP } from "@/ledger/admin/adminApp";
import type { LedgerApp } from "@/ledger/apps/registry";
import { refundsApp } from "@/apps/refunds/app";

/**
 * Composition root: which applications this deployment of the Ledger runs.
 *
 * This is the only module that knows both the platform (`src/ledger`) and the
 * applications (`src/apps`). Installing a new internal tool means adding its
 * manifest to this list; nothing in `src/ledger` changes.
 */
export const INSTALLED_APPS: readonly LedgerApp[] = [refundsApp, LEDGER_ADMIN_APP];
