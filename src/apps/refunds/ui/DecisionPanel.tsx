"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/ledger/ui/ConfirmDialog";
import { Field, FormError, TextArea } from "@/ledger/ui/form";
import { Button } from "@/ledger/ui/primitives";
import { formatMoney } from "@/ledger/ui/format";
import { submitRefundDecision } from "../service/actions";
import { MIN_NOTE_LENGTH } from "../domain/rules";

type Decision = "APPROVE" | "REJECT" | "ESCALATE";

export interface DecisionOption {
  decision: Decision;
  allowed: boolean;
  reason?: string;
  noteRequired: boolean;
}

const LABEL: Record<Decision, string> = {
  APPROVE: "Approve refund",
  REJECT: "Reject refund",
  ESCALATE: "Escalate to admin",
};

/**
 * The decision surface. It mirrors the server's rules to guide the reviewer,
 * but the server re-validates and re-authorizes every submission — a forged
 * request gets a FORBIDDEN/RULE_VIOLATION result and an audit entry.
 */
export function DecisionPanel({
  refundId,
  amountCents,
  currency,
  options,
  terminal,
}: {
  refundId: string;
  amountCents: number;
  currency: string;
  options: DecisionOption[];
  terminal: boolean;
}) {
  const [note, setNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  if (terminal) {
    return (
      <p className="text-muted">
        This refund has reached a terminal state. Its decision and audit history
        are immutable; a new request must be created to refund again.
      </p>
    );
  }

  const optionFor = (decision: Decision) =>
    options.find((option) => option.decision === decision);
  const noteRequired = options.some(
    (option) => option.allowed && option.noteRequired,
  );

  function submit(decision: Decision) {
    setError(undefined);
    setSuccess(undefined);
    startTransition(async () => {
      const result = await submitRefundDecision(decision, refundId, note);
      setPendingDecision(null);
      if (result.status === "error") {
        setError(result.message);
      } else {
        setSuccess(result.message);
        setNote("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Decision note"
        required={noteRequired}
        hint={`Required for rejections, escalations and high-value approvals (min ${MIN_NOTE_LENGTH} characters).`}
        error={error}
      >
        <TextArea
          rows={3}
          value={note}
          invalid={Boolean(error)}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explain the evidence you checked and the policy you applied…"
        />
      </Field>

      {success && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-800">
          {success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["APPROVE", "REJECT", "ESCALATE"] as const).map((decision) => {
          const option = optionFor(decision);
          const noteTooShort =
            Boolean(option?.noteRequired) &&
            note.trim().length < MIN_NOTE_LENGTH;
          const disabled = !option?.allowed || noteTooShort || isPending;
          const unavailableReason = option?.allowed
            ? noteTooShort
              ? `Requires a note of at least ${MIN_NOTE_LENGTH} characters`
              : undefined
            : option?.reason;
          return (
            <Button
              key={decision}
              variant={
                decision === "APPROVE"
                  ? "primary"
                  : decision === "REJECT"
                    ? "danger"
                    : "secondary"
              }
              disabled={disabled}
              title={unavailableReason}
              onClick={() => {
                setError(undefined);
                setPendingDecision(decision);
              }}
            >
              {LABEL[decision]}
            </Button>
          );
        })}
      </div>

      {options
        .filter((option) => !option.allowed && option.reason)
        .map((option) => (
          <FormError
            key={option.decision}
            message={`${LABEL[option.decision]} unavailable: ${option.reason}`}
          />
        ))}

      <ConfirmDialog
        open={pendingDecision !== null}
        busy={isPending}
        destructive={pendingDecision === "REJECT"}
        title={pendingDecision ? LABEL[pendingDecision] : ""}
        confirmLabel={pendingDecision ? LABEL[pendingDecision] : "Confirm"}
        body={
          <div className="flex flex-col gap-2">
            <p>
              {pendingDecision === "APPROVE" &&
                `Approving releases ${formatMoney(amountCents, currency)} back to the customer. This cannot be undone.`}
              {pendingDecision === "REJECT" &&
                `Rejecting closes ${refundId} permanently. The customer keeps the original charge.`}
              {pendingDecision === "ESCALATE" &&
                `Escalating hands ${refundId} to an admin for secondary approval.`}
            </p>
            {note.trim() && (
              <p className="rounded border border-line bg-canvas px-2 py-1.5 text-[12px]">
                <strong>Note:</strong> {note.trim()}
              </p>
            )}
          </div>
        }
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => pendingDecision && submit(pendingDecision)}
      />
    </div>
  );
}
