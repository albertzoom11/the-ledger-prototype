import { NotFoundError } from "@/ledger/action/defineAction";
import { requirePermission, type Actor } from "@/ledger/auth/actor";
import { auditTrailFor } from "@/ledger/audit/auditLog";
import type { Filter, Page } from "@/ledger/data/repository";
import {
  parseMoneyToCents,
  parsePage,
  resolveSort,
  type SortState,
} from "@/ledger/ui/listView";
import { REFUND_PERMISSIONS } from "../app";
import {
  findRefundById,
  queryRefunds,
  recentCustomerTransactions,
  statusCounts,
  type RefundSortKey,
} from "../data/refundRepository";
import {
  REFUND_REASONS,
  REFUND_STATUSES,
  type RefundListItem,
  type RefundReason,
  type RefundStatus,
} from "../domain/types";
import { checkDecision, refundFlags, type RefundFlag } from "../domain/rules";

/**
 * Read-side of the refunds application. Reads are authorised too — a caller
 * without `refunds:view` cannot load the queue even by hitting the route
 * directly.
 */

export interface RefundQueueQuery {
  q?: string;
  status?: string;
  reason?: string;
  method?: string;
  minAmount?: string;
  maxAmount?: string;
  from?: string;
  to?: string;
  flagged?: string;
  sort?: string;
  dir?: string;
  page?: string;
}

export interface RefundQueueResult {
  page: Page<RefundListItem>;
  counts: Record<RefundStatus, number>;
  sort: SortState<RefundSortKey>;
  flagsById: Record<string, RefundFlag[]>;
}

const SORT_KEYS: readonly RefundSortKey[] = [
  "requestedAt",
  "amount",
  "status",
  "customer",
  "reviewedAt",
];

const DEFAULT_SORT: SortState<RefundSortKey> = {
  key: "requestedAt",
  direction: "desc",
};

export function buildQueueFilters(
  query: RefundQueueQuery,
  options: { includeStatus?: boolean } = {},
): Filter[] {
  const { includeStatus = true } = options;
  const filters: Filter[] = [];

  if (query.q?.trim()) {
    filters.push({
      op: "search",
      columns: ["c.name", "c.email", "r.id", "t.id", "r.requester_note"],
      value: query.q,
    });
  }
  if (
    includeStatus &&
    query.status &&
    (REFUND_STATUSES as readonly string[]).includes(query.status)
  ) {
    filters.push({ column: "r.status", op: "=", value: query.status });
  }
  if (query.reason && (REFUND_REASONS as readonly string[]).includes(query.reason)) {
    filters.push({ column: "r.reason", op: "=", value: query.reason });
  }
  if (query.method?.trim()) {
    filters.push({ column: "t.payment_method", op: "=", value: query.method });
  }
  const min = parseMoneyToCents(query.minAmount);
  if (min !== null) {
    filters.push({ column: "r.requested_amount_cents", op: ">=", value: min });
  }
  const max = parseMoneyToCents(query.maxAmount);
  if (max !== null) {
    filters.push({ column: "r.requested_amount_cents", op: "<=", value: max });
  }
  if (query.from) {
    filters.push({ column: "r.requested_at", op: ">=", value: query.from });
  }
  if (query.to) {
    filters.push({ column: "r.requested_at", op: "<=", value: `${query.to}T23:59:59Z` });
  }
  if (query.flagged === "high_value") {
    filters.push({ column: "r.requested_amount_cents", op: ">=", value: 50_000 });
  }
  if (query.flagged === "high_risk") {
    filters.push({ column: "c.risk_tier", op: "=", value: "HIGH" });
  }
  if (query.flagged === "over_refund") {
    filters.push({
      column: "r.requested_amount_cents - t.amount_cents",
      op: ">=",
      value: 1,
    });
  }

  return filters;
}

export function listRefundQueue(
  actor: Actor,
  query: RefundQueueQuery,
): RefundQueueResult {
  requirePermission(actor, REFUND_PERMISSIONS.view);

  const sort = resolveSort(SORT_KEYS, query, DEFAULT_SORT);
  const filters = buildQueueFilters(query);

  const page = queryRefunds({
    filters,
    sort,
    page: { page: parsePage(query.page), pageSize: 20 },
  });

  const flagsById: Record<string, RefundFlag[]> = {};
  for (const refund of page.items) flagsById[refund.id] = refundFlags(refund);

  return {
    page,
    counts: statusCounts(buildQueueFilters(query, { includeStatus: false })),
    sort,
    flagsById,
  };
}

export interface RefundDetail {
  refund: RefundListItem;
  flags: RefundFlag[];
  auditTrail: ReturnType<typeof auditTrailFor>;
  recentTransactions: ReturnType<typeof recentCustomerTransactions>;
  /** What the current actor may do, computed with the same rules the server enforces. */
  availableDecisions: {
    decision: "APPROVE" | "REJECT" | "ESCALATE";
    allowed: boolean;
    reason?: string;
    noteRequired: boolean;
  }[];
}

export function getRefundDetail(actor: Actor, refundId: string): RefundDetail {
  requirePermission(actor, REFUND_PERMISSIONS.view);
  const refund = findRefundById(refundId);
  if (!refund) throw new NotFoundError(`Refund ${refundId} not found`);

  const decisions = (["APPROVE", "REJECT", "ESCALATE"] as const).map((decision) => {
    // Probe with a note that satisfies the length rule so the surfaced reason is
    // about authorization/state, not the empty note the reviewer hasn't typed yet.
    const probe = checkDecision(refund, decision, actor, "x".repeat(200));
    return {
      decision,
      allowed: probe.allowed,
      reason: probe.reason,
      noteRequired: probe.noteRequired,
    };
  });

  return {
    refund,
    flags: refundFlags(refund),
    auditTrail: auditTrailFor("refund", refund.id),
    recentTransactions: recentCustomerTransactions(refund.customerId),
    availableDecisions: decisions,
  };
}

export function reasonOptions(): { value: RefundReason; label: string }[] {
  return REFUND_REASONS.map((reason) => ({ value: reason, label: reason }));
}
