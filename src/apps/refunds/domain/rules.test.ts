import { describe, expect, it } from "vitest";
import type { Actor } from "@/ledger/auth/actor";
import {
  checkDecision,
  permissionsForDecision,
  refundFlags,
  MIN_NOTE_LENGTH,
} from "./rules";
import type { RefundListItem } from "./types";

const reviewer: Actor = {
  id: "usr_reviewer_1",
  name: "Priya Raman",
  email: "priya@ledger.dev",
  role: "REVIEWER",
  permissions: ["refunds:view", "refunds:decide"],
};
const admin: Actor = {
  id: "usr_admin_1",
  name: "Sam Ortega",
  email: "sam@ledger.dev",
  role: "ADMIN",
  permissions: [
    "refunds:view",
    "refunds:decide",
    "refunds:decide_high_value",
  ],
};

const NOTE = "x".repeat(MIN_NOTE_LENGTH);

function refund(overrides: Partial<RefundListItem> = {}): RefundListItem {
  return {
    id: "rf_1",
    transactionId: "txn_1",
    requestedAmountCents: 12_500,
    reason: "SERVICE_ISSUE",
    requesterNote: "Outage",
    status: "PENDING",
    requestedAt: "2026-08-14T12:00:00.000Z",
    reviewedAt: null,
    reviewerId: null,
    decisionNote: null,
    currency: "USD",
    transactionAmountCents: 20_000,
    transactionDate: "2026-08-01T12:00:00.000Z",
    paymentMethod: "VISA",
    customerId: "cus_1",
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    customerRiskTier: "LOW",
    reviewerName: null,
    siblingRefundCount: 0,
    customerRefundCount: 1,
    ...overrides,
  };
}

describe("refund decision rules", () => {
  it("lets a reviewer approve a standard pending refund without a note", () => {
    expect(checkDecision(refund(), "APPROVE", reviewer, "")).toMatchObject({
      allowed: true,
      noteRequired: false,
    });
  });

  it("requires a substantive note to reject", () => {
    expect(checkDecision(refund(), "REJECT", reviewer, "too short").allowed).toBe(false);
    expect(checkDecision(refund(), "REJECT", reviewer, NOTE).allowed).toBe(true);
  });

  it("blocks reviewers from approving high-value refunds but allows admins", () => {
    const highValue = refund({
      requestedAmountCents: 80_000,
      transactionAmountCents: 90_000,
    });
    const denied = checkDecision(highValue, "APPROVE", reviewer, NOTE);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toMatch(/Admin/);
    expect(checkDecision(highValue, "APPROVE", admin, NOTE).allowed).toBe(true);
  });

  it("allows a reviewer to escalate what they cannot approve", () => {
    const highValue = refund({ requestedAmountCents: 80_000, transactionAmountCents: 90_000 });
    expect(checkDecision(highValue, "ESCALATE", reviewer, NOTE).allowed).toBe(true);
  });

  it("refuses to approve more than the original transaction", () => {
    const over = refund({ requestedAmountCents: 30_000, transactionAmountCents: 20_000 });
    expect(checkDecision(over, "APPROVE", admin, NOTE)).toMatchObject({ allowed: false });
  });

  it("treats approved and rejected refunds as immutable", () => {
    for (const status of ["APPROVED", "REJECTED"] as const) {
      const done = refund({ status });
      for (const decision of ["APPROVE", "REJECT", "ESCALATE"] as const) {
        expect(checkDecision(done, decision, admin, NOTE).allowed).toBe(false);
      }
    }
  });

  it("does not allow re-escalating an escalated refund", () => {
    const escalated = refund({ status: "ESCALATED" });
    expect(checkDecision(escalated, "ESCALATE", reviewer, NOTE).allowed).toBe(false);
    expect(checkDecision(escalated, "APPROVE", admin, NOTE).allowed).toBe(true);
  });
});

describe("permissions required for a decision", () => {
  it("adds the admin permission only for approving a high-value refund", () => {
    const highValue = refund({ requestedAmountCents: 75_000 });

    expect(permissionsForDecision(refund(), "APPROVE")).toEqual(["refunds:decide"]);
    expect(permissionsForDecision(highValue, "APPROVE")).toEqual([
      "refunds:decide",
      "refunds:decide_high_value",
    ]);
    expect(permissionsForDecision(highValue, "REJECT")).toEqual(["refunds:decide"]);
    expect(permissionsForDecision(highValue, "ESCALATE")).toEqual(["refunds:decide"]);
  });
});

describe("refund flags", () => {
  it("surfaces over-refund, duplicate, repeat-requester and SLA signals", () => {
    const flagged = refund({
      requestedAmountCents: 60_000,
      transactionAmountCents: 20_000,
      siblingRefundCount: 2,
      customerRefundCount: 4,
      customerRiskTier: "HIGH",
      reason: "FRAUD_SUSPECTED",
      requestedAt: "2026-08-01T00:00:00.000Z",
    });
    const codes = refundFlags(flagged, new Date("2026-08-15T00:00:00.000Z")).map(
      (flag) => flag.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "OVER_REFUND",
        "HIGH_VALUE",
        "DUPLICATE_REQUEST",
        "REPEAT_REQUESTER",
        "HIGH_RISK_CUSTOMER",
        "FRAUD",
        "AGED",
      ]),
    );
  });

  it("returns no flags for a clean, recent request", () => {
    expect(
      refundFlags(refund(), new Date("2026-08-14T18:00:00.000Z")),
    ).toHaveLength(0);
  });
});
