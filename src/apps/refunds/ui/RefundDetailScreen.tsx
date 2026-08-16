import { notFound } from "next/navigation";
import clsx from "clsx";
import { NotFoundError } from "@/ledger/action/defineAction";
import type { Actor } from "@/ledger/auth/actor";
import { AuditTimeline } from "@/ledger/audit/AuditTimeline";
import { StatusBadge } from "@/ledger/ui/StatusBadge";
import {
  ButtonLink,
  Card,
  DescriptionList,
  Mono,
  PageHeader,
} from "@/ledger/ui/primitives";
import { formatDateTime, formatMoney, formatRelative } from "@/ledger/ui/format";
import { getRefundDetail } from "../service/refundQueries";
import { isTerminal } from "../domain/rules";
import {
  PAYMENT_METHOD_LABELS,
  REFUND_REASON_LABELS,
  REFUND_STATUS_DESCRIPTORS,
} from "../domain/types";
import { DecisionPanel } from "./DecisionPanel";

/**
 * The refund detail screen. The route file under `src/app` only resolves the
 * actor and the id; everything refund-shaped lives in the application.
 */
export function RefundDetailScreen({
  actor,
  refundId,
}: {
  actor: Actor;
  refundId: string;
}) {
  let detail;
  try {
    detail = getRefundDetail(actor, refundId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const { refund, flags, auditTrail, recentTransactions, availableDecisions } = detail;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations · Refunds"
        title={`Refund ${refund.id}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge descriptor={REFUND_STATUS_DESCRIPTORS[refund.status]} />
            <span>
              {formatMoney(refund.requestedAmountCents, refund.currency)} requested{" "}
              {formatRelative(refund.requestedAt)} · {REFUND_REASON_LABELS[refund.reason]}
            </span>
          </span>
        }
        actions={
          <ButtonLink href="/refunds" variant="secondary" size="sm">
            Back to queue
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Refund request">
            <DescriptionList
              columns={3}
              items={[
                {
                  label: "Requested amount",
                  value: (
                    <strong>
                      {formatMoney(refund.requestedAmountCents, refund.currency)}
                    </strong>
                  ),
                },
                {
                  label: "Original charge",
                  value: formatMoney(refund.transactionAmountCents, refund.currency),
                },
                { label: "Reason", value: REFUND_REASON_LABELS[refund.reason] },
                { label: "Requested at", value: formatDateTime(refund.requestedAt) },
                {
                  label: "Reviewed at",
                  value: refund.reviewedAt ? formatDateTime(refund.reviewedAt) : "—",
                },
                { label: "Reviewer", value: refund.reviewerName ?? "Unassigned" },
              ]}
            />
            <div className="mt-3 rounded border border-line bg-canvas px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Requester note
              </p>
              <p className="text-ink">{refund.requesterNote}</p>
            </div>
            {refund.decisionNote && (
              <div className="mt-2 rounded border border-line bg-canvas px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Decision note
                </p>
                <p className="text-ink">{refund.decisionNote}</p>
              </div>
            )}
          </Card>

          <Card title="Risk signals" dense>
            {flags.length === 0 ? (
              <p className="px-4 py-3 text-muted">
                No risk signals on this request.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {flags.map((flag) => (
                  <li key={flag.code} className="flex gap-3 px-4 py-2">
                    <span
                      className={clsx(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        flag.severity === "danger"
                          ? "bg-red-600"
                          : flag.severity === "warn"
                            ? "bg-amber-500"
                            : "bg-blue-500",
                      )}
                    />
                    <div>
                      <p className="text-[13px] font-medium text-ink">{flag.label}</p>
                      <p className="text-muted">{flag.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Audit history" dense>
            <AuditTimeline events={auditTrail} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Decision">
            <DecisionPanel
              refundId={refund.id}
              amountCents={refund.requestedAmountCents}
              currency={refund.currency}
              terminal={isTerminal(refund.status)}
              options={availableDecisions}
              expectedStatus={refund.status}
            />
          </Card>

          <Card title="Customer">
            <DescriptionList
              columns={1}
              items={[
                { label: "Name", value: refund.customerName },
                { label: "Email", value: refund.customerEmail },
                { label: "Risk tier", value: refund.customerRiskTier },
                {
                  label: "Lifetime refund requests",
                  value: refund.customerRefundCount,
                },
                { label: "Customer id", value: <Mono>{refund.customerId}</Mono> },
              ]}
            />
          </Card>

          <Card title="Transaction">
            <DescriptionList
              columns={1}
              items={[
                { label: "Transaction id", value: <Mono>{refund.transactionId}</Mono> },
                {
                  label: "Amount",
                  value: formatMoney(refund.transactionAmountCents, refund.currency),
                },
                {
                  label: "Payment method",
                  value: PAYMENT_METHOD_LABELS[refund.paymentMethod],
                },
                { label: "Date", value: formatDateTime(refund.transactionDate) },
                {
                  label: "Other refunds on this charge",
                  value: refund.siblingRefundCount,
                },
              ]}
            />
          </Card>

          <Card title="Recent customer activity" dense>
            <ul className="divide-y divide-line">
              {recentTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-2 px-4 py-2"
                >
                  <div className="min-w-0">
                    <Mono>{transaction.id}</Mono>
                    <p className="truncate text-muted">{transaction.descriptor}</p>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums">
                      {formatMoney(transaction.amountCents, transaction.currency)}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formatRelative(transaction.transactionDate)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
