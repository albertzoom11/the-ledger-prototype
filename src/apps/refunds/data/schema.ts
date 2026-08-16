import { applySchema } from "@/ledger/data/db";

/**
 * Tables owned by the refunds application. The platform owns `users` and
 * `audit_events`; everything refund-shaped lives here, which is why the refunds
 * application can be removed (or a second application added) without touching
 * platform code.
 */
const REFUNDS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    risk_tier TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    descriptor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    requested_amount_cents INTEGER NOT NULL,
    reason TEXT NOT NULL,
    requester_note TEXT NOT NULL,
    status TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewer_id TEXT REFERENCES users(id),
    decision_note TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
  CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refunds(requested_at);
  CREATE INDEX IF NOT EXISTS idx_txn_customer ON transactions(customer_id);
`;

let applied = false;

/** Idempotent; called by the refunds repository and by the seed script. */
export function ensureRefundsSchema(): void {
  if (applied) return;
  applySchema(REFUNDS_SCHEMA);
  applied = true;
}
