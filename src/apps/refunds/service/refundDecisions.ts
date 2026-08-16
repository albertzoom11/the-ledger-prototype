import { z } from "zod";
import {
  NotFoundError,
  RuleViolationError,
  defineAction,
  type ActionResult,
} from "@/ledger/action/defineAction";
import type { Actor } from "@/ledger/auth/actor";
import { findRefundById, updateRefundState } from "../data/refundRepository";
import {
  checkDecision,
  nextStatusFor,
  type RefundDecision,
} from "../domain/rules";
import type { RefundListItem } from "../domain/types";
import { REFUND_PERMISSIONS } from "../app";

/**
 * Write-side of the refunds application.
 *
 * Every decision goes through the Ledger `defineAction` wrapper, so validation,
 * server-side permission checks and audit logging are structural rather than
 * something each call site has to remember.
 */

const decisionInput = z.object({
  refundId: z.string().min(1),
  note: z.string().max(1000).default(""),
  /** Optimistic-concurrency guard: the status the reviewer was looking at. */
  expectedStatus: z.string().optional(),
});

export type DecisionInput = z.infer<typeof decisionInput>;

export interface DecisionOutput {
  refundId: string;
  from: string;
  to: string;
  amountCents: number;
}

function loadRefund(refundId: string): RefundListItem {
  const refund = findRefundById(refundId);
  if (!refund) throw new NotFoundError(`Refund ${refundId} not found`);
  return refund;
}

/** Enforcement point: turns a failed rule check into an audited rejection. */
function assertDecisionAllowed(
  refund: RefundListItem,
  decision: RefundDecision,
  actor: Actor,
  note: string,
): void {
  const check = checkDecision(refund, decision, actor, note);
  if (!check.allowed) {
    throw new RuleViolationError(check.reason ?? "Decision not allowed", "note");
  }
}

function makeDecisionAction(
  decision: "APPROVE" | "REJECT" | "ESCALATE",
  permission: typeof REFUND_PERMISSIONS.decide,
) {
  return defineAction<DecisionInput, DecisionOutput>({
    name: `refunds.${decision.toLowerCase()}`,
    permission,
    input: decisionInput,
    handler: (input, { actor }) => {
      const refund = loadRefund(input.refundId);
      assertDecisionAllowed(refund, decision, actor, input.note);

      const nextStatus = nextStatusFor(decision);
      updateRefundState(refund.id, {
        status: nextStatus,
        reviewerId: actor.id,
        reviewedAt: new Date().toISOString(),
        decisionNote: input.note.trim() ? input.note.trim() : null,
      });

      return {
        refundId: refund.id,
        from: refund.status,
        to: nextStatus,
        amountCents: refund.requestedAmountCents,
      };
    },
    audit: ({ input, output }) => ({
      entityType: "refund",
      entityId: input?.refundId ?? "unknown",
      action: `refunds.${decision.toLowerCase()}`,
      metadata: {
        from: output?.from ?? "",
        to: output?.to ?? nextStatusFor(decision),
        amountCents: output?.amountCents ?? "",
        note: input?.note?.trim() ?? "",
      },
    }),
  });
}

const DECIDE = REFUND_PERMISSIONS.decide;

export const approveRefund = makeDecisionAction("APPROVE", DECIDE);
export const rejectRefund = makeDecisionAction("REJECT", DECIDE);
export const escalateRefund = makeDecisionAction("ESCALATE", DECIDE);

export function decideRefund(
  decision: "APPROVE" | "REJECT" | "ESCALATE",
  input: DecisionInput,
  actor: Actor,
): Promise<ActionResult<DecisionOutput>> {
  const action =
    decision === "APPROVE"
      ? approveRefund
      : decision === "REJECT"
        ? rejectRefund
        : escalateRefund;
  return action(input, { actor });
}
