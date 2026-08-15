import Link from "next/link";
import type { Column } from "@/ledger/ui/DataTable";
import type { FilterField } from "@/ledger/ui/FilterBar";
import { StatusBadge } from "@/ledger/ui/StatusBadge";
import { Mono, Pill } from "@/ledger/ui/primitives";
import { formatMoney, formatRelative } from "@/ledger/ui/format";
import type { RefundFlag } from "../domain/rules";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REFUND_REASONS,
  REFUND_REASON_LABELS,
  REFUND_STATUSES,
  REFUND_STATUS_DESCRIPTORS,
  type RefundListItem,
} from "../domain/types";

/**
 * Application-specific configuration of the platform's table/filter
 * primitives. No bespoke table or filter code — only declarations.
 */

export const refundFilterFields: FilterField[] = [
  {
    kind: "search",
    name: "q",
    label: "Search",
    placeholder: "Customer, email, refund or transaction id…",
  },
  {
    kind: "select",
    name: "status",
    label: "Status",
    anyLabel: "All statuses",
    options: REFUND_STATUSES.map((status) => ({
      value: status,
      label: REFUND_STATUS_DESCRIPTORS[status].label,
    })),
  },
  {
    kind: "select",
    name: "reason",
    label: "Reason",
    anyLabel: "All reasons",
    options: REFUND_REASONS.map((reason) => ({
      value: reason,
      label: REFUND_REASON_LABELS[reason],
    })),
  },
  {
    kind: "select",
    name: "method",
    label: "Method",
    anyLabel: "All methods",
    options: PAYMENT_METHODS.map((method) => ({
      value: method,
      label: PAYMENT_METHOD_LABELS[method],
    })),
  },
  {
    kind: "select",
    name: "flagged",
    label: "Signal",
    anyLabel: "Any signal",
    options: [
      { value: "high_value", label: "High value (≥ $500)" },
      { value: "high_risk", label: "High-risk customer" },
      { value: "over_refund", label: "Exceeds charge" },
    ],
  },
  { kind: "number", name: "minAmount", label: "Min $", placeholder: "0.00" },
  { kind: "number", name: "maxAmount", label: "Max $", placeholder: "5000.00" },
  { kind: "date", name: "from", label: "Requested from" },
  { kind: "date", name: "to", label: "Requested to" },
];

export function refundColumns(
  flagsById: Record<string, RefundFlag[]>,
): Column<RefundListItem>[] {
  return [
    {
      key: "id",
      header: "Refund",
      width: "132px",
      render: (refund) => (
        <span className="font-mono text-[12px] font-medium text-accent">
          {refund.id}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      width: "140px",
      render: (refund) => (
        <StatusBadge descriptor={REFUND_STATUS_DESCRIPTORS[refund.status]} size="sm" />
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortKey: "customer",
      render: (refund) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{refund.customerName}</div>
          <div className="truncate text-[12px] text-muted">{refund.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Requested",
      sortKey: "amount",
      align: "right",
      width: "120px",
      render: (refund) => (
        <span className="font-medium tabular-nums">
          {formatMoney(refund.requestedAmountCents, refund.currency)}
        </span>
      ),
    },
    {
      key: "txnAmount",
      header: "Charge",
      align: "right",
      width: "110px",
      hideBelow: "lg",
      render: (refund) => (
        <span className="tabular-nums text-muted">
          {formatMoney(refund.transactionAmountCents, refund.currency)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      width: "150px",
      hideBelow: "md",
      render: (refund) => (
        <span className="text-muted">{REFUND_REASON_LABELS[refund.reason]}</span>
      ),
    },
    {
      key: "flags",
      header: "Signals",
      render: (refund) => {
        const flags = flagsById[refund.id] ?? [];
        if (flags.length === 0) return <span className="text-line">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {flags.slice(0, 3).map((flag) => (
              <Pill
                key={flag.code}
                tone={flag.severity === "danger" ? "danger" : flag.severity === "warn" ? "warn" : "neutral"}
              >
                {flag.label}
              </Pill>
            ))}
            {flags.length > 3 && <Pill>+{flags.length - 3}</Pill>}
          </div>
        );
      },
    },
    {
      key: "requestedAt",
      header: "Requested",
      sortKey: "requestedAt",
      width: "110px",
      render: (refund) => (
        <span className="whitespace-nowrap text-muted">
          {formatRelative(refund.requestedAt)}
        </span>
      ),
    },
    {
      key: "reviewer",
      header: "Reviewer",
      width: "130px",
      hideBelow: "lg",
      render: (refund) =>
        refund.reviewerName ? (
          <span className="truncate text-muted">{refund.reviewerName}</span>
        ) : (
          <span className="text-line">Unassigned</span>
        ),
    },
    {
      key: "open",
      header: "",
      width: "70px",
      align: "right",
      render: (refund) => (
        <Link
          href={`/refunds/${refund.id}`}
          className="rounded border border-line bg-surface px-2 py-0.5 text-[12px] text-ink hover:bg-canvas"
        >
          Open
        </Link>
      ),
    },
  ];
}

export function TransactionSummary({ refund }: { refund: RefundListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-muted">
      <Mono>{refund.transactionId}</Mono>
      <span>·</span>
      <span>{PAYMENT_METHOD_LABELS[refund.paymentMethod]}</span>
      <span>·</span>
      <span>{formatMoney(refund.transactionAmountCents, refund.currency)}</span>
    </div>
  );
}
