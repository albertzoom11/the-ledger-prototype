import {
  Filter,
  Row,
  buildWhere,
  defineQuery,
  execute,
  optionalString,
  requireNumber,
  requireString,
  selectAll,
  selectOne,
  type SqlParam,
} from "@/ledger/data/repository";
import type {
  Customer,
  PaymentMethod,
  RefundListItem,
  RefundReason,
  RefundStatus,
  RiskTier,
  Transaction,
} from "../domain/types";
import { ensureRefundsSchema } from "./schema";

/**
 * Refunds data access. All reads/writes for the application live here and are
 * built out of the Ledger data primitives (defineQuery, buildWhere, ...).
 *
 * The application's own tables are installed on first use, so a server action
 * that runs before any page render still finds them.
 */

ensureRefundsSchema();

const REFUND_FROM = `
  FROM refunds r
  JOIN transactions t ON t.id = r.transaction_id
  JOIN customers c ON c.id = t.customer_id
  LEFT JOIN users u ON u.id = r.reviewer_id`;

const REFUND_SELECT = `SELECT
    r.id, r.transaction_id, r.requested_amount_cents, r.reason, r.requester_note,
    r.status, r.requested_at, r.reviewed_at, r.reviewer_id, r.decision_note,
    t.amount_cents AS transaction_amount_cents, t.currency, t.transaction_date,
    t.payment_method, c.id AS customer_id, c.name AS customer_name,
    c.email AS customer_email, c.risk_tier AS customer_risk_tier,
    u.name AS reviewer_name,
    (SELECT COUNT(*) FROM refunds s WHERE s.transaction_id = r.transaction_id AND s.id != r.id)
      AS sibling_refund_count,
    (SELECT COUNT(*) FROM refunds cr JOIN transactions ct ON ct.id = cr.transaction_id
      WHERE ct.customer_id = c.id) AS customer_refund_count
  ${REFUND_FROM}`;

function mapRefund(row: Row): RefundListItem {
  return {
    id: requireString(row, "id"),
    transactionId: requireString(row, "transaction_id"),
    requestedAmountCents: requireNumber(row, "requested_amount_cents"),
    reason: requireString(row, "reason") as RefundReason,
    requesterNote: requireString(row, "requester_note"),
    status: requireString(row, "status") as RefundStatus,
    requestedAt: requireString(row, "requested_at"),
    reviewedAt: optionalString(row, "reviewed_at"),
    reviewerId: optionalString(row, "reviewer_id"),
    decisionNote: optionalString(row, "decision_note"),
    currency: requireString(row, "currency"),
    transactionAmountCents: requireNumber(row, "transaction_amount_cents"),
    transactionDate: requireString(row, "transaction_date"),
    paymentMethod: requireString(row, "payment_method") as PaymentMethod,
    customerId: requireString(row, "customer_id"),
    customerName: requireString(row, "customer_name"),
    customerEmail: requireString(row, "customer_email"),
    customerRiskTier: requireString(row, "customer_risk_tier") as RiskTier,
    reviewerName: optionalString(row, "reviewer_name"),
    siblingRefundCount: requireNumber(row, "sibling_refund_count"),
    customerRefundCount: requireNumber(row, "customer_refund_count"),
  };
}

export type RefundSortKey =
  | "requestedAt"
  | "amount"
  | "status"
  | "customer"
  | "reviewedAt";

export const queryRefunds = defineQuery<RefundListItem, RefundSortKey>({
  select: REFUND_SELECT,
  count: `SELECT COUNT(*) AS total ${REFUND_FROM}`,
  sortColumns: {
    requestedAt: "r.requested_at",
    amount: "r.requested_amount_cents",
    status: "r.status",
    customer: "c.name",
    reviewedAt: "r.reviewed_at",
  },
  defaultSort: { key: "requestedAt", direction: "desc" },
  map: mapRefund,
});

export function findRefundById(id: string): RefundListItem | null {
  return selectOne(`${REFUND_SELECT} WHERE r.id = ?`, [id], mapRefund);
}

/**
 * Per-status totals under the given filters. Callers pass every active filter
 * except the status filter itself, so each tab shows how many rows it would
 * yield for the current search.
 */
export function statusCounts(filters: Filter[] = []): Record<RefundStatus, number> {
  const counts: Record<RefundStatus, number> = {
    PENDING: 0,
    ESCALATED: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  const where = buildWhere(filters);
  const rows = selectAll<{ status: RefundStatus; total: number }>(
    `SELECT r.status AS status, COUNT(*) AS total ${REFUND_FROM} ${where.sql} GROUP BY r.status`,
    where.params,
    (row) => ({
      status: requireString(row, "status") as RefundStatus,
      total: requireNumber(row, "total"),
    }),
  );
  for (const row of rows) counts[row.status] = row.total;
  return counts;
}

export interface RefundStateUpdate {
  status: RefundStatus;
  fromStatus: RefundStatus;
  reviewerId: string;
  reviewedAt: string;
  decisionNote: string | null;
}

/**
 * Applies a state transition only if the row is still in `fromStatus`, so two
 * reviewers deciding the same refund cannot both win. Returns false when the
 * row moved underneath the caller.
 */
export function updateRefundState(
  id: string,
  update: RefundStateUpdate,
): boolean {
  const params: SqlParam[] = [
    update.status,
    update.reviewerId,
    update.reviewedAt,
    update.decisionNote,
    id,
    update.fromStatus,
  ];
  return (
    execute(
      `UPDATE refunds
          SET status = ?, reviewer_id = ?, reviewed_at = ?, decision_note = ?
        WHERE id = ? AND status = ?`,
      params,
    ) === 1
  );
}

export function findCustomer(id: string): Customer | null {
  return selectOne(`SELECT * FROM customers WHERE id = ?`, [id], (row) => ({
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    email: requireString(row, "email"),
    riskTier: requireString(row, "risk_tier") as RiskTier,
    createdAt: requireString(row, "created_at"),
  }));
}

export function findTransaction(id: string): Transaction | null {
  return selectOne(`SELECT * FROM transactions WHERE id = ?`, [id], (row) => ({
    id: requireString(row, "id"),
    customerId: requireString(row, "customer_id"),
    amountCents: requireNumber(row, "amount_cents"),
    currency: requireString(row, "currency"),
    transactionDate: requireString(row, "transaction_date"),
    paymentMethod: requireString(row, "payment_method") as PaymentMethod,
    descriptor: requireString(row, "descriptor"),
  }));
}

export function recentCustomerTransactions(
  customerId: string,
  limit = 5,
): Transaction[] {
  return selectAll(
    `SELECT * FROM transactions WHERE customer_id = ?
      ORDER BY transaction_date DESC LIMIT ?`,
    [customerId, limit],
    (row) => ({
      id: requireString(row, "id"),
      customerId: requireString(row, "customer_id"),
      amountCents: requireNumber(row, "amount_cents"),
      currency: requireString(row, "currency"),
      transactionDate: requireString(row, "transaction_date"),
      paymentMethod: requireString(row, "payment_method") as PaymentMethod,
      descriptor: requireString(row, "descriptor"),
    }),
  );
}
