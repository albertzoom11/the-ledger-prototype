import { toActor, type UserRecord } from "@/ledger/auth/users";
import { getDb } from "@/ledger/data/db";
import { accessPolicy } from "@/platform/access";
import { bootstrapLedger } from "@/platform/bootstrap";

/**
 * Fixtures for authorization tests. Actors are built the way the running app
 * builds them — a stored user plus the permissions its role is granted by the
 * installed app manifests — so a test can never invent a permission the
 * deployment does not actually grant.
 */

export const REVIEWER = toActor(
  {
    id: "usr_reviewer_1",
    name: "Priya Raman",
    email: "priya@ledger.test",
    role: "REVIEWER",
  } satisfies UserRecord,
  accessPolicy,
);

export const ADMIN = toActor(
  {
    id: "usr_admin_1",
    name: "Sam Ortega",
    email: "sam@ledger.test",
    role: "ADMIN",
  } satisfies UserRecord,
  accessPolicy,
);

export function resetDatabase(): void {
  bootstrapLedger();
  const db = getDb();
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM sessions;
    DELETE FROM audit_events;
    DELETE FROM refunds;
    DELETE FROM transactions;
    DELETE FROM customers;
    DELETE FROM users;
    PRAGMA foreign_keys = ON;
  `);

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, role, password_hash, failed_attempts, locked_until)
     VALUES (?, ?, ?, ?, 'unused', 0, NULL)`,
  );
  for (const user of [REVIEWER, ADMIN]) {
    insertUser.run(user.id, user.name, user.email, user.role);
  }

  db.prepare(
    "INSERT INTO customers (id, name, email, risk_tier, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("cus_1", "Ada Fisher", "ada@example.com", "LOW", "2026-01-01T00:00:00.000Z");
}

/** Inserts a refund (and its transaction) large enough to cover the request. */
export function insertRefund(options: {
  id: string;
  requestedAmountCents: number;
  status?: "PENDING" | "ESCALATED" | "APPROVED" | "REJECTED";
  transactionAmountCents?: number;
}): void {
  const {
    id,
    requestedAmountCents,
    status = "PENDING",
    transactionAmountCents = requestedAmountCents * 2,
  } = options;
  const db = getDb();

  const transactionId = `txn_${id}`;
  db.prepare(
    `INSERT INTO transactions
       (id, customer_id, amount_cents, currency, transaction_date, payment_method, descriptor)
     VALUES (?, 'cus_1', ?, 'USD', '2026-07-01T00:00:00.000Z', 'CARD', ?)`,
  ).run(transactionId, transactionAmountCents, `Order ${id}`);

  db.prepare(
    `INSERT INTO refunds
       (id, transaction_id, requested_amount_cents, reason, requester_note, status,
        requested_at, reviewed_at, reviewer_id, decision_note)
     VALUES (?, ?, ?, 'ITEM_NOT_RECEIVED', 'Parcel never arrived.', ?,
             '2026-08-01T00:00:00.000Z', NULL, NULL, NULL)`,
  ).run(id, transactionId, requestedAmountCents, status);
}
