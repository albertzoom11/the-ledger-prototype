import { beforeEach, describe, expect, it } from "vitest";
import { auditTrailFor } from "@/ledger/audit/auditLog";
import { ADMIN, REVIEWER, insertRefund, resetDatabase } from "@/test/fixtures";
import { findRefundById } from "../data/refundRepository";
import { listRefundQueue } from "./refundQueries";
import { decideRefund } from "./refundDecisions";

/**
 * Authorization as seen by a caller that skips the UI entirely: these tests only
 * ever call the service layer, with payloads a browser would never send.
 */

const NOTE = "Checked the shipping evidence and applied the 30-day policy.";

beforeEach(() => {
  resetDatabase();
  insertRefund({ id: "rf_small", requestedAmountCents: 12_000 });
  insertRefund({ id: "rf_big", requestedAmountCents: 90_000 });
});

describe("high-value approval is a permission, not a UI state", () => {
  it("denies a reviewer with FORBIDDEN and leaves the refund untouched", async () => {
    const result = await decideRefund(
      "APPROVE",
      { refundId: "rf_big", note: NOTE },
      REVIEWER,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    expect(findRefundById("rf_big")).toMatchObject({
      status: "PENDING",
      reviewerId: null,
    });
  });

  it("audits the denial with the permission the caller was missing", async () => {
    await decideRefund("APPROVE", { refundId: "rf_big", note: NOTE }, REVIEWER);

    const [event] = auditTrailFor("refund", "rf_big");
    expect(event).toMatchObject({
      action: "refunds.approve",
      actorId: REVIEWER.id,
      outcome: "DENIED",
    });
    expect(event?.metadata).toMatchObject({
      requiredPermission: "refunds:decide_high_value",
    });
  });

  it("ignores an amount and a role supplied by the caller", async () => {
    // A crafted payload: a small amount, an admin role, no expected status.
    const result = await decideRefund(
      "APPROVE",
      {
        refundId: "rf_big",
        note: NOTE,
        requestedAmountCents: 100,
        actorRole: "ADMIN",
      } as unknown as Parameters<typeof decideRefund>[1],
      REVIEWER,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    expect(findRefundById("rf_big")?.status).toBe("PENDING");
  });

  it("lets the reviewer escalate and the admin approve what was escalated", async () => {
    const escalated = await decideRefund(
      "ESCALATE",
      { refundId: "rf_big", note: NOTE, expectedStatus: "PENDING" },
      REVIEWER,
    );
    expect(escalated.ok).toBe(true);

    const approved = await decideRefund(
      "APPROVE",
      { refundId: "rf_big", note: NOTE, expectedStatus: "ESCALATED" },
      ADMIN,
    );
    expect(approved.ok).toBe(true);
    expect(findRefundById("rf_big")).toMatchObject({
      status: "APPROVED",
      reviewerId: ADMIN.id,
    });
  });
});

describe("permissions a reviewer does have", () => {
  it("approves a standard refund and reads the queue", async () => {
    const approved = await decideRefund(
      "APPROVE",
      { refundId: "rf_small", note: "" },
      REVIEWER,
    );
    expect(approved.ok).toBe(true);
    expect(findRefundById("rf_small")?.status).toBe("APPROVED");

    expect(listRefundQueue(REVIEWER, {}).page.total).toBe(2);
  });

  it("returns NOT_FOUND rather than leaking whether a refund is high value", async () => {
    const result = await decideRefund(
      "APPROVE",
      { refundId: "rf_missing", note: NOTE },
      REVIEWER,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
