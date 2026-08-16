"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/platform/access";
import type { ActionError } from "@/ledger/action/defineAction";
import { decideRefund } from "./refundDecisions";

/**
 * Server actions are a thin transport layer: they resolve the actor from the
 * session and delegate to the audited business action. No authorization logic
 * lives in the UI.
 */

export interface DecisionFormState {
  status: "idle" | "success" | "error";
  message?: string;
  error?: ActionError;
}

export async function submitRefundDecision(
  decision: "APPROVE" | "REJECT" | "ESCALATE",
  refundId: string,
  note: string,
): Promise<DecisionFormState> {
  const actor = await getActor();
  const result = await decideRefund(decision, { refundId, note }, actor);

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
