import type { Actor } from "@/ledger/auth/actor";
import { can } from "@/ledger/auth/actor";
import { ageInHours } from "@/ledger/time";
import type { RefundListItem, RefundStatus } from "./types";

/**
 * Refund business rules — pure functions with no I/O and no server-only
 * imports, so they are trivially testable and safe to share with client
 * components (the UI uses them to *explain* what will happen; the service layer
 * uses them to *enforce* it).
 */

export type RefundDecision = "APPROVE" | "REJECT" | "ESCALATE";

/** Refunds at or above this amount need an Admin to approve. */
export const HIGH_VALUE_THRESHOLD_CENTS = 50_000;
export const MIN_NOTE_LENGTH = 15;
export const AGED_REQUEST_HOURS = 72;

export const TERMINAL_STATUSES: readonly RefundStatus[] = ["APPROVED", "REJECTED"];

export function isTerminal(status: RefundStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const ALLOWED_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "ESCALATED"],
  ESCALATED: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export function nextStatusFor(decision: RefundDecision): RefundStatus {
  return decision === "APPROVE"
    ? "APPROVED"
    : decision === "REJECT"
      ? "REJECTED"
      : "ESCALATED";
}

export function isHighValue(refund: RefundListItem): boolean {
  return refund.requestedAmountCents >= HIGH_VALUE_THRESHOLD_CENTS;
}

export interface RefundFlag {
  code: string;
  label: string;
  detail: string;
  severity: "info" | "warn" | "danger";
}

/** Reviewer-facing risk signals, derived rather than stored. */
export function refundFlags(refund: RefundListItem, now: Date = new Date()): RefundFlag[] {
  const flags: RefundFlag[] = [];

  if (refund.requestedAmountCents > refund.transactionAmountCents) {
    flags.push({
      code: "OVER_REFUND",
      label: "Exceeds original charge",
      detail: "Requested amount is larger than the underlying transaction.",
      severity: "danger",
    });
  }
  if (isHighValue(refund)) {
    flags.push({
      code: "HIGH_VALUE",
      label: "High value",
      detail: "Requires Admin approval.",
      severity: "warn",
    });
  }
  if (refund.siblingRefundCount > 0) {
    flags.push({
      code: "DUPLICATE_REQUEST",
      label: "Duplicate request",
      detail: `${refund.siblingRefundCount} other refund request(s) on this transaction.`,
      severity: "warn",
    });
  }
  if (refund.customerRefundCount >= 3) {
    flags.push({
      code: "REPEAT_REQUESTER",
      label: "Repeat requester",
      detail: `${refund.customerRefundCount} lifetime refund requests from this customer.`,
      severity: "warn",
    });
  }
  if (refund.customerRiskTier === "HIGH") {
    flags.push({
      code: "HIGH_RISK_CUSTOMER",
      label: "High-risk customer",
      detail: "Customer is in the high-risk tier.",
      severity: "warn",
    });
  }
  if (refund.reason === "FRAUD_SUSPECTED") {
    flags.push({
      code: "FRAUD",
      label: "Fraud suspected",
      detail: "Confirm the fraud review before approving.",
      severity: "danger",
    });
  }
  if (
    !isTerminal(refund.status) &&
    ageInHours(refund.requestedAt, now) >= AGED_REQUEST_HOURS
  ) {
    flags.push({
      code: "AGED",
      label: "Breaching SLA",
      detail: `Open for ${ageInHours(refund.requestedAt, now)}h (SLA ${AGED_REQUEST_HOURS}h).`,
      severity: "info",
    });
  }

  return flags;
}

export interface DecisionCheck {
  allowed: boolean;
  /** Why the decision is unavailable, in reviewer-facing language. */
  reason?: string;
  noteRequired: boolean;
}

/**
 * The single source of truth for "can this actor make this decision now?".
 * `assertDecisionAllowed` is what the service layer enforces.
 */
export function checkDecision(
  refund: RefundListItem,
  decision: RefundDecision,
  actor: Actor,
  note: string,
): DecisionCheck {
  const noteRequired = decision !== "APPROVE" || isHighValue(refund);

  if (isTerminal(refund.status)) {
    return {
      allowed: false,
      noteRequired,
      reason: `Refund is already ${refund.status.toLowerCase()} and cannot be changed.`,
    };
  }
  if (!ALLOWED_TRANSITIONS[refund.status].includes(nextStatusFor(decision))) {
    return {
      allowed: false,
      noteRequired,
      reason: `${decision.toLowerCase()} is not a valid transition from ${refund.status.toLowerCase()}.`,
    };
  }
  if (!can(actor, "refunds:decide")) {
    return {
      allowed: false,
      noteRequired,
      reason: "Your role cannot process refunds.",
    };
  }
  if (
    decision === "APPROVE" &&
    isHighValue(refund) &&
    !can(actor, "refunds:decide_high_value")
  ) {
    return {
      allowed: false,
      noteRequired,
      reason:
        "Refunds of $500.00 or more must be approved by an Admin. Escalate this request instead.",
    };
  }
  if (
    decision === "APPROVE" &&
    refund.requestedAmountCents > refund.transactionAmountCents
  ) {
    return {
      allowed: false,
      noteRequired,
      reason: "Requested amount exceeds the original transaction amount.",
    };
  }
  if (noteRequired && note.trim().length < MIN_NOTE_LENGTH) {
    return {
      allowed: false,
      noteRequired,
      reason: `A note of at least ${MIN_NOTE_LENGTH} characters is required for this decision.`,
    };
  }

  return { allowed: true, noteRequired };
}
