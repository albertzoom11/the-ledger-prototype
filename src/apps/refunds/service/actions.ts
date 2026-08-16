"use server";

import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/ledger/auth/session";
import type { ActionError } from "@/ledger/action/defineAction";
import type { RefundStatus } from "../domain/types";
import { decideRefund } from "./refundDecisions";

export interface DecisionFormState {
  status: "idle" | "success" | "error";
  message?: string;
  error?: ActionError;
}

export interface DecisionRequest {
  decision: "APPROVE" | "REJECT" | "ESCALATE";
  refundId: string;
  note: string;
  expectedStatus: RefundStatus;
}

export async function submitRefundDecision({
  decision,
  refundId,
  note,
  expectedStatus,
}: DecisionRequest): Promise<DecisionFormState> {
  const actor = await getCurrentActor();
  if (!actor) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again to record this decision.",
      error: { code: "UNAUTHENTICATED", message: "No active session" },
    };
  }

  const result = await decideRefund(
    decision,
    { refundId, note, expectedStatus },
    actor,
  );

  if (!result.ok) {
    return { status: "error", message: result.error.message, error: result.error };
  }

  revalidatePath("/refunds");
  revalidatePath(`/refunds/${refundId}`);
  revalidatePath("/admin/audit");

  return {
    status: "success",
    message: `Refund ${result.data.refundId} moved to ${result.data.to.toLowerCase()}.`,
  };
}
