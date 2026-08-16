/**
 * Deterministic synthetic data for The Ledger prototype.
 * Run with `npm run seed` (or `npm run seed -- --force` to rebuild).
 */
import { randomUUID } from "node:crypto";
import { getDb } from "../src/ledger/data/db";
import { bootstrapLedger } from "../src/platform/bootstrap";
import { recordAuditEvent } from "../src/ledger/audit/auditLog";
import { hashPassword } from "../src/ledger/auth/password";
import {
  PAYMENT_METHODS,
  REFUND_REASONS,
  type PaymentMethod,
  type RefundReason,
  type RefundStatus,
  type RiskTier,
} from "../src/apps/refunds/domain/types";

// Small deterministic PRNG so the dataset is stable across runs/machines.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260815);
const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const FIRST_NAMES = [
  "Ava", "Liam", "Maya", "Noah", "Sofia", "Ethan", "Priya", "Lucas", "Zoe",
  "Omar", "Chloe", "Mateo", "Nina", "Jonas", "Aisha", "Caleb", "Elena", "Rohan",
  "Grace", "Tobias", "Ines", "Marcus", "Lena", "Diego", "Hana", "Peter",
  "Camila", "Yusuf", "Freya", "Andre", "Ruby", "Kenji", "Sara", "Victor",
  "Mila", "Iman", "Otto", "Talia", "Bruno", "Nadia",
];
const LAST_NAMES = [
  "Okafor", "Ramirez", "Chen", "Novak", "Silva", "Haddad", "Kim", "Torres",
  "Petrov", "Iyer", "Nguyen", "Fischer", "Duarte", "Bianchi", "Kowalski",
  "Moreau", "Sato", "Lindqvist", "Abebe", "Costa", "Weber", "Diaz", "Ali",
  "Berg", "Kaur", "Rossi", "Ferrari", "Yamada", "Hassan", "Larsen",
];
const DESCRIPTORS = [
  "LEDGER*SUBSCRIPTION", "LEDGER*INVOICE", "LEDGER*TOPUP", "LEDGER*PAYOUT FEE",
  "LEDGER*CARD ISSUE", "LEDGER*ANNUAL PLAN", "LEDGER*OVERAGE",
];
const REQUESTER_NOTES: Record<RefundReason, string[]> = {
  DUPLICATE_CHARGE: [
    "Customer was billed twice for the same invoice on the same day.",
    "Two identical charges appeared minutes apart; customer only authorized one.",
  ],
  FRAUD_SUSPECTED: [
    "Customer states the card was used without authorization.",
    "Charge originated from an unrecognized device and location.",
  ],
  SERVICE_ISSUE: [
    "Platform outage affected the customer for most of the billing period.",
    "Customer could not access paid features for eleven days.",
  ],
  ITEM_NOT_RECEIVED: [
    "Physical card was never delivered; tracking shows no movement.",
    "Customer never received the hardware token they were billed for.",
  ],
  ORDER_CANCELED: [
    "Customer canceled during the trial but was still charged.",
    "Plan downgrade was requested before renewal but processed late.",
  ],
  GOODWILL: [
    "Support offered a partial credit after a long resolution time.",
    "Retention credit approved verbally by the account manager.",
  ],
};
const DECISION_NOTES: Partial<Record<RefundStatus, string[]>> = {
  APPROVED: [
    "Verified duplicate settlement in the processor ledger; refunding in full.",
    "Outage confirmed in the incident timeline; refund is within policy.",
    "Fraud team confirmed unauthorized use; approving per chargeback policy.",
  ],
  REJECTED: [
    "Charge matches an authorized order and delivery was confirmed by tracking.",
    "Request falls outside the 60-day refund window documented in policy.",
    "Customer used the service for the full period; no policy basis to refund.",
  ],
  ESCALATED: [
    "High-value request; escalating to an admin for secondary approval.",
    "Amount above reviewer limit and fraud signals present; needs admin review.",
  ],
};

/**
 * Synthetic demo password for the seeded prototype accounts. Override with
 * LEDGER_DEMO_PASSWORD; only the scrypt hash is ever stored.
 */
const DEMO_PASSWORD = process.env.LEDGER_DEMO_PASSWORD ?? "ledger-demo";

const NOW = new Date("2026-08-15T18:00:00.000Z");
const iso = (daysAgo: number, hourOffset = 0) =>
  new Date(NOW.getTime() - daysAgo * 86_400_000 + hourOffset * 3_600_000).toISOString();

const USERS = [
  { id: "usr_reviewer_1", name: "Priya Raman", email: "priya.raman@ledger.dev", role: "REVIEWER" },
  { id: "usr_reviewer_2", name: "Dev Okonkwo", email: "dev.okonkwo@ledger.dev", role: "REVIEWER" },
  { id: "usr_admin_1", name: "Sam Ortega", email: "sam.ortega@ledger.dev", role: "ADMIN" },
] as const;

function seed(): void {
  // Installs each application's tables on top of the platform schema.
  bootstrapLedger();
  const db = getDb();
  const force = process.argv.includes("--force");
  const existing = db
    .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM refunds")
    .get();
  if ((existing?.count ?? 0) > 0 && !force) {
    console.log(
      `Database already has ${existing?.count} refunds. Use "npm run seed -- --force" to rebuild.`,
    );
    return;
  }

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
  const insertCustomer = db.prepare(
    "INSERT INTO customers (id, name, email, risk_tier, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertTransaction = db.prepare(
    `INSERT INTO transactions
      (id, customer_id, amount_cents, currency, transaction_date, payment_method, descriptor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertRefund = db.prepare(
    `INSERT INTO refunds
      (id, transaction_id, requested_amount_cents, reason, requester_note, status,
       requested_at, reviewed_at, reviewer_id, decision_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const seedAll = db.transaction(() => {
    for (const user of USERS) {
      insertUser.run(
        user.id,
        user.name,
        user.email,
        user.role,
        hashPassword(DEMO_PASSWORD),
      );
    }

    const customerIds: string[] = [];
    for (let i = 0; i < 48; i += 1) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const id = `cus_${String(1000 + i)}`;
      const riskTier: RiskTier = rand() < 0.12 ? "HIGH" : rand() < 0.4 ? "MEDIUM" : "LOW";
      insertCustomer.run(
        id,
        `${first} ${last}`,
        `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        riskTier,
        iso(int(120, 900)),
      );
      customerIds.push(id);
    }

    const transactionIds: string[] = [];
    for (let i = 0; i < 180; i += 1) {
      const id = `txn_${String(50_000 + i)}`;
      const method: PaymentMethod = pick(PAYMENT_METHODS);
      insertTransaction.run(
        id,
        pick(customerIds),
        int(1_200, 240_000),
        "USD",
        iso(int(1, 120), -int(0, 20)),
        method,
        pick(DESCRIPTORS),
      );
      transactionIds.push(id);
    }

    const transactions = db
      .prepare<[], { id: string; amount_cents: number; transaction_date: string }>(
        "SELECT id, amount_cents, transaction_date FROM transactions",
      )
      .all();
    const byId = new Map(transactions.map((t) => [t.id, t]));

    const statusPlan: RefundStatus[] = [
      ...Array<RefundStatus>(38).fill("PENDING"),
      ...Array<RefundStatus>(9).fill("ESCALATED"),
      ...Array<RefundStatus>(34).fill("APPROVED"),
      ...Array<RefundStatus>(21).fill("REJECTED"),
    ];

    let refundIndex = 0;
    for (const status of statusPlan) {
      const transactionId = pick(transactionIds);
      const transaction = byId.get(transactionId)!;
      const reason: RefundReason = pick(REFUND_REASONS);

      // Mostly full refunds, sometimes partial, occasionally over-refund (a flag).
      const roll = rand();
      const requestedAmount =
        roll < 0.62
          ? transaction.amount_cents
          : roll < 0.94
            ? Math.max(500, Math.round(transaction.amount_cents * (0.2 + rand() * 0.6)))
            : transaction.amount_cents + int(500, 6_000);

      const requestedDaysAgo = int(0, 45);
      const requestedAt = iso(requestedDaysAgo, -int(0, 18));
      const terminal = status === "APPROVED" || status === "REJECTED";
      const reviewer = pick(USERS);
      const reviewerId = terminal
        ? requestedAmount >= 50_000
          ? "usr_admin_1"
          : reviewer.id
        : null;

      const id = `rf_${String(9000 + refundIndex)}`;
      insertRefund.run(
        id,
        transactionId,
        requestedAmount,
        reason,
        pick(REQUESTER_NOTES[reason]),
        status,
        requestedAt,
        terminal ? iso(Math.max(requestedDaysAgo - int(0, 2), 0), int(1, 10)) : null,
        reviewerId,
        terminal ? pick(DECISION_NOTES[status]!) : null,
      );

      recordAuditEvent(
        {
          entityType: "refund",
          entityId: id,
          action: "refunds.request_created",
          metadata: {
            amountCents: requestedAmount,
            reason,
            transactionId,
            source: "support_portal",
          },
        },
        { id: "usr_reviewer_1", role: "REVIEWER" },
        requestedAt,
      );

      if (terminal) {
        recordAuditEvent(
          {
            entityType: "refund",
            entityId: id,
            action: status === "APPROVED" ? "refunds.approve" : "refunds.reject",
            metadata: {
              from: "PENDING",
              to: status,
              amountCents: requestedAmount,
              note: pick(DECISION_NOTES[status]!),
            },
          },
          {
            id: reviewerId ?? "usr_reviewer_1",
            role: reviewerId === "usr_admin_1" ? "ADMIN" : "REVIEWER",
          },
          iso(Math.max(requestedDaysAgo - 1, 0), int(1, 10)),
        );
      }

      if (status === "ESCALATED") {
        recordAuditEvent(
          {
            entityType: "refund",
            entityId: id,
            action: "refunds.escalate",
            metadata: {
              from: "PENDING",
              to: "ESCALATED",
              amountCents: requestedAmount,
              note: pick(DECISION_NOTES.ESCALATED!),
            },
          },
          { id: "usr_reviewer_2", role: "REVIEWER" },
          iso(requestedDaysAgo, int(1, 6)),
        );
      }

      refundIndex += 1;
    }

    // A denied high-value approval attempt, so the audit log shows enforcement.
    const highValue = db
      .prepare<[], { id: string; requested_amount_cents: number }>(
        `SELECT id, requested_amount_cents FROM refunds
          WHERE status = 'PENDING' AND requested_amount_cents >= 50000 LIMIT 1`,
      )
      .get();
    if (highValue) {
      recordAuditEvent(
        {
          entityType: "refund",
          entityId: highValue.id,
          action: "refunds.approve",
          outcome: "DENIED",
          metadata: {
            requiredPermission: "refunds:decide_high_value",
            amountCents: highValue.requested_amount_cents,
            reason: "Reviewer attempted to approve a high-value refund",
          },
        },
        { id: "usr_reviewer_2", role: "REVIEWER" },
        iso(1, 3),
      );
    }
  });

  seedAll();

  const counts = db
    .prepare<[], { customers: number; transactions: number; refunds: number; events: number }>(
      `SELECT
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM refunds) AS refunds,
        (SELECT COUNT(*) FROM audit_events) AS events`,
    )
    .get();

  console.log(
    `Seeded The Ledger: ${counts?.customers} customers, ${counts?.transactions} transactions, ` +
      `${counts?.refunds} refunds, ${counts?.events} audit events (run id ${randomUUID().slice(0, 8)}).`,
  );
  console.log(
    `Sign in with ${USERS.map((user) => user.email).join(" / ")} — password: ${DEMO_PASSWORD}`,
  );
}

seed();
