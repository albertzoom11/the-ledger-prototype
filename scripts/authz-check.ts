/**
 * Authorization smoke check — proves the rules hold with no UI in the picture.
 *
 * Run with `npm run authz:check`. It builds a throwaway database, then calls the
 * refund service and the admin read services directly as each role, exactly as a
 * script, a cron job or a hand-rolled HTTP request would. Exits non-zero if any
 * expectation fails.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Must be set before the data layer is imported.
process.env.LEDGER_DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "ledger-authz-")),
  "ledger.db",
);

async function main(): Promise<void> {
  const { ADMIN, REVIEWER, insertRefund, resetDatabase } = await import(
    "../src/test/fixtures"
  );
  const { decideRefund } = await import("../src/apps/refunds/service/refundDecisions");
  const { findRefundById } = await import("../src/apps/refunds/data/refundRepository");
  const { listRefundQueue } = await import("../src/apps/refunds/service/refundQueries");
  const { listAuditEvents } = await import("../src/ledger/audit/auditService");
  const { getAccessOverview } = await import("../src/ledger/auth/accessService");
  const { ForbiddenError } = await import("../src/ledger/auth/actor");
  const { accessPolicy } = await import("../src/platform/access");

  const NOTE = "Checked with the customer and the payment processor";
  let failures = 0;

  function report(expectation: string, ok: boolean, detail: string): void {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${expectation}\n        ${detail}`);
  }

  function readAs(label: string, actor: typeof REVIEWER, read: () => unknown): void {
    try {
      read();
      report(label, label.includes("allowed"), "read succeeded");
    } catch (error) {
      const forbidden = error instanceof ForbiddenError;
      report(
        label,
        label.includes("denied") && forbidden,
        forbidden
          ? `FORBIDDEN (${error.permission}) for ${actor.role}`
          : `unexpected error: ${String(error)}`,
      );
    }
  }

  resetDatabase();

  // --- Writes -----------------------------------------------------------------
  insertRefund({ id: "rf_standard", requestedAmountCents: 12_500 });
  insertRefund({ id: "rf_high_value", requestedAmountCents: 75_000 });

  const standard = await decideRefund(
    "APPROVE",
    { refundId: "rf_standard", note: "" },
    REVIEWER,
  );
  report(
    "reviewer approving a standard refund is allowed",
    standard.ok && findRefundById("rf_standard")?.status === "APPROVED",
    `result=${standard.ok ? "ok" : standard.error.code}, status=${findRefundById("rf_standard")?.status}`,
  );

  const denied = await decideRefund(
    "APPROVE",
    { refundId: "rf_high_value", note: NOTE },
    REVIEWER,
  );
  report(
    "reviewer approving a high-value refund is denied and the record is untouched",
    !denied.ok &&
      denied.error.code === "FORBIDDEN" &&
      findRefundById("rf_high_value")?.status === "PENDING",
    `result=${denied.ok ? "ok" : denied.error.code}, status=${findRefundById("rf_high_value")?.status}`,
  );

  const spoofed = await decideRefund(
    "APPROVE",
    {
      refundId: "rf_high_value",
      note: NOTE,
      requestedAmountCents: 1,
      actorRole: "ADMIN",
    } as never,
    REVIEWER,
  );
  report(
    "crafted input claiming a small amount and an admin role is still denied",
    !spoofed.ok && spoofed.error.code === "FORBIDDEN",
    `result=${spoofed.ok ? "ok" : spoofed.error.code}`,
  );

  const escalated = await decideRefund(
    "ESCALATE",
    { refundId: "rf_high_value", note: NOTE },
    REVIEWER,
  );
  report(
    "reviewer escalating a high-value refund is allowed",
    escalated.ok && findRefundById("rf_high_value")?.status === "ESCALATED",
    `status=${findRefundById("rf_high_value")?.status}`,
  );

  const adminApproval = await decideRefund(
    "APPROVE",
    { refundId: "rf_high_value", note: NOTE },
    ADMIN,
  );
  report(
    "admin approving the escalated high-value refund is allowed",
    adminApproval.ok && findRefundById("rf_high_value")?.status === "APPROVED",
    `status=${findRefundById("rf_high_value")?.status}`,
  );

  const terminal = await decideRefund(
    "REJECT",
    { refundId: "rf_high_value", note: NOTE },
    ADMIN,
  );
  report(
    "re-deciding a terminal refund is rejected by the rules",
    !terminal.ok && terminal.error.code === "RULE_VIOLATION",
    `result=${terminal.ok ? "ok" : terminal.error.code}`,
  );

  // --- Reads ------------------------------------------------------------------
  readAs("reviewer reading the refund queue is allowed", REVIEWER, () =>
    listRefundQueue(REVIEWER, {}),
  );
  readAs("reviewer reading the audit log is denied", REVIEWER, () =>
    listAuditEvents(REVIEWER, {}),
  );
  readAs("reviewer reading access control is denied", REVIEWER, () =>
    getAccessOverview(REVIEWER, accessPolicy),
  );
  readAs("admin reading the audit log is allowed", ADMIN, () =>
    listAuditEvents(ADMIN, {}),
  );
  readAs("admin reading access control is allowed", ADMIN, () =>
    getAccessOverview(ADMIN, accessPolicy),
  );

  // --- Audit trail ------------------------------------------------------------
  const auditedDenials = listAuditEvents(ADMIN, { outcome: "DENIED" }).page.items;
  report(
    "denied attempts are written to the audit log with the missing permission",
    auditedDenials.length === 2 &&
      auditedDenials.every(
        (event) => event.metadata.requiredPermission === "refunds:decide_high_value",
      ),
    `${auditedDenials.length} DENIED event(s): ${auditedDenials
      .map((event) => `${event.action}/${event.actorRole}`)
      .join(", ")}`,
  );

  console.log(
    failures === 0
      ? "\nAll authorization expectations held."
      : `\n${failures} authorization expectation(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
