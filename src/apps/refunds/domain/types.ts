import type { StatusDescriptor } from "@/ledger/ui/StatusBadge";

/** Refunds application domain model. */

export const REFUND_STATUSES = [
  "PENDING",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_REASONS = [
  "DUPLICATE_CHARGE",
  "FRAUD_SUSPECTED",
  "SERVICE_ISSUE",
  "ITEM_NOT_RECEIVED",
  "ORDER_CANCELED",
  "GOODWILL",
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const PAYMENT_METHODS = [
  "VISA",
  "MASTERCARD",
  "AMEX",
  "ACH",
  "APPLE_PAY",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RiskTier = "LOW" | "MEDIUM" | "HIGH";

export interface Customer {
  id: string;
  name: string;
  email: string;
  riskTier: RiskTier;
  createdAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  amountCents: number;
  currency: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  descriptor: string;
}

export interface Refund {
  id: string;
  transactionId: string;
  requestedAmountCents: number;
  reason: RefundReason;
  requesterNote: string;
  status: RefundStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  decisionNote: string | null;
}

/** Denormalised row used by the queue table and the detail header. */
export interface RefundListItem extends Refund {
  currency: string;
  transactionAmountCents: number;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerRiskTier: RiskTier;
  reviewerName: string | null;
  /** Other refund requests against the same transaction. */
  siblingRefundCount: number;
  /** Total refunds ever requested by this customer. */
  customerRefundCount: number;
}

export const REFUND_STATUS_DESCRIPTORS: Record<RefundStatus, StatusDescriptor> = {
  PENDING: { label: "Pending review", tone: "info" },
  ESCALATED: { label: "Escalated", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  DUPLICATE_CHARGE: "Duplicate charge",
  FRAUD_SUSPECTED: "Fraud suspected",
  SERVICE_ISSUE: "Service issue",
  ITEM_NOT_RECEIVED: "Item not received",
  ORDER_CANCELED: "Order canceled",
  GOODWILL: "Goodwill",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "Amex",
  ACH: "ACH",
  APPLE_PAY: "Apple Pay",
};
