import { beforeEach, describe, expect, it } from "vitest";
import { auditTrailFor } from "@/ledger/audit/auditLog";
import type { Actor } from "@/ledger/auth/actor";
import { hashPassword } from "@/ledger/auth/password";
import {
  actorForSessionToken,
  createSession,
  revokeSession,
  signInWithPassword,
} from "@/ledger/auth/sessionStore";
import { getDb } from "@/ledger/data/db";
import { findRefundById } from "../data/refundRepository";
import { decideRefund } from "./refundDecisions";

/**
 * End-to-end coverage of the real path: sign in, decide through the service
 * layer, and assert what SQLite and the audit log actually contain.
 */

const PASSWORD = "test-password";
const NOTE = "Checked the shipping evidence and applied the 30-day policy.";

const reviewer: Actor = {
  id: "usr_reviewer_1",
  name: "Priya Raman",
  email: "priya@ledger.test",
  role: "REVIEWER",
};
const admin: Actor = {
  id: "usr_admin_1",
  name: "Sam Ortega",
  email: "sam@ledger.test",
  role: "ADMIN",
};

function seedFixtures(): void {
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
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
  );
  for (const user of [reviewer, admin]) {
    insertUser.run(
      user.id,
      user.name,
      user.email,
      user.role,
      hashPassword(PASSWORD),
    );
  }

  db.prepare(
    "INSERT INTO customers (id, name, email, risk_tier, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("cus_1", "Ada Fisher", "ada@example.com", "LOW", "2026-01-01T00:00:00.000Z");

  const insertTransaction = db.prepare(
    `INSERT INTO transactions
       (id, customer_id, amount_cents, currency, transaction_date, payment_method, descriptor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  insertTransaction.run(
    "txn_1",
    "cus_1",
    20_000,
    "USD",
    "2026-07-01T00:00:00.000Z",
    "CARD",
    "Order 1",
  );
  insertTransaction.run(
    "txn_2",
    "cus_1",
    120_000,
    "USD",
    "2026-07-02T00:00:00.000Z",
    "CARD",
    "Order 2",
  );

  const insertRefund = db.prepare(
    `INSERT INTO refunds
       (id, transaction_id, requested_amount_cents, reason, requester_note, status,
        requested_at, reviewed_at, reviewer_id, decision_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
  );
  insertRefund.run(
    "rf_pending",
    "txn_1",
    12_000,
    "ITEM_NOT_RECEIVED",
    "Parcel never arrived.",
    "PENDING",
    "2026-08-01T00:00:00.000Z",
  );
  insertRefund.run(
    "rf_high_value",
    "txn_2",
    90_000,
    "ITEM_NOT_RECEIVED",
    "Bulk order missing.",
    "PENDING",
    "2026-08-01T00:00:00.000Z",
  );
}

beforeEach(() => {
  seedFixtures();
});

describe("authentication", () => {
  it("issues a session for valid credentials and resolves the actor from it", () => {
    const result = signInWithPassword(reviewer.email, PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(actorForSessionToken(result.session.token)?.id).toBe(reviewer.id);

    revokeSession(result.session.token);
    expect(actorForSessionToken(result.session.token)).toBeNull();
  });

  it("rejects a wrong password and an unknown email identically", () => {
    expect(signInWithPassword(reviewer.email, "nope")).toMatchObject({
      ok: false,
      reason: "INVALID_CREDENTIALS",
    });
    expect(signInWithPassword("nobody@ledger.test", PASSWORD)).toMatchObject({
      ok: false,
      reason: "INVALID_CREDENTIALS",
    });
  });

  it("locks the account after repeated failures", () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(signInWithPassword(reviewer.email, "nope")).toMatchObject({
        reason: "INVALID_CREDENTIALS",
      });
    }
    expect(signInWithPassword(reviewer.email, "nope")).toMatchObject({
      reason: "LOCKED",
    });
    // Even the correct password is refused while the lockout holds.
    expect(signInWithPassword(reviewer.email, PASSWORD)).toMatchObject({
      reason: "LOCKED",
    });
  });

  it("treats an expired session as signed out", () => {
    const past = new Date(Date.now() - 48 * 3_600_000);
    const session = createSession(reviewer.id, past);
    expect(actorForSessionToken(session.token)).toBeNull();
  });
});

describe("refund decisions", () => {
  it("persists an approval and writes an audit event with actor, action and metadata", async () => {
    const result = await decideRefund(
      "APPROVE",
      { refundId: "rf_pending", note: "", expectedStatus: "PENDING" },
      reviewer,
    );
    expect(result.ok).toBe(true);

    expect(findRefundById("rf_pending")).toMatchObject({
      status: "APPROVED",
      reviewerId: reviewer.id,
    });

    const [event] = auditTrailFor("refund", "rf_pending");
    expect(event).toMatchObject({
      action: "refunds.approve",
      actorId: reviewer.id,
      actorRole: "REVIEWER",
      outcome: "SUCCESS",
    });
    expect(event?.metadata).toMatchObject({ from: "PENDING", to: "APPROVED" });
    expect(event?.timestamp).toBeTruthy();
  });

  it("requires a note to reject and leaves the row untouched when missing", async () => {
    const rejected = await decideRefund(
      "REJECT",
      { refundId: "rf_pending", note: "too short", expectedStatus: "PENDING" },
      reviewer,
    );
    expect(rejected.ok).toBe(false);
    expect(findRefundById("rf_pending")?.status).toBe("PENDING");
    expect(auditTrailFor("refund", "rf_pending")[0]?.outcome).toBe(
      "REJECTED_BY_RULE",
    );

    const accepted = await decideRefund(
      "REJECT",
      { refundId: "rf_pending", note: NOTE, expectedStatus: "PENDING" },
      reviewer,
    );
    expect(accepted.ok).toBe(true);
    expect(findRefundById("rf_pending")).toMatchObject({
      status: "REJECTED",
      decisionNote: NOTE,
    });
  });

  it("blocks a decision on a terminal refund", async () => {
    await decideRefund(
      "APPROVE",
      { refundId: "rf_pending", note: "", expectedStatus: "PENDING" },
      reviewer,
    );
    const second = await decideRefund(
      "REJECT",
      { refundId: "rf_pending", note: NOTE, expectedStatus: "APPROVED" },
      reviewer,
    );
    expect(second.ok).toBe(false);
    expect(findRefundById("rf_pending")?.status).toBe("APPROVED");
  });

  it("refuses a stale decision when the refund moved since the page rendered", async () => {
    await decideRefund(
      "ESCALATE",
      { refundId: "rf_high_value", note: NOTE, expectedStatus: "PENDING" },
      reviewer,
    );

    const stale = await decideRefund(
      "APPROVE",
      { refundId: "rf_high_value", note: NOTE, expectedStatus: "PENDING" },
      admin,
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("RULE_VIOLATION");
    expect(findRefundById("rf_high_value")?.status).toBe("ESCALATED");
  });

  it("denies a high-value approval for a reviewer but allows it for an admin", async () => {
    const denied = await decideRefund(
      "APPROVE",
      { refundId: "rf_high_value", note: NOTE, expectedStatus: "PENDING" },
      reviewer,
    );
    expect(denied.ok).toBe(false);
    expect(findRefundById("rf_high_value")?.status).toBe("PENDING");

    const allowed = await decideRefund(
      "APPROVE",
      { refundId: "rf_high_value", note: NOTE, expectedStatus: "PENDING" },
      admin,
    );
    expect(allowed.ok).toBe(true);
    expect(findRefundById("rf_high_value")?.status).toBe("APPROVED");
  });
});
