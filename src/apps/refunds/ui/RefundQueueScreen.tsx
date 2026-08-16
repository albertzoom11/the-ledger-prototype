import { Suspense } from "react";
import type { Actor } from "@/ledger/auth/actor";
import { DataTable, Pagination } from "@/ledger/ui/DataTable";
import { FilterBar } from "@/ledger/ui/FilterBar";
import { StatusTabs, type StatusTab } from "@/ledger/ui/StatusTabs";
import { Card, PageHeader, TableSkeleton } from "@/ledger/ui/primitives";
import { formatMoney } from "@/ledger/ui/format";
import {
  listHref,
  readListParams,
  type ListParams,
  type SearchParams,
} from "@/ledger/ui/listView";
import { listRefundQueue } from "../service/refundQueries";
import {
  REFUND_STATUSES,
  REFUND_STATUS_DESCRIPTORS,
} from "../domain/types";
import { refundColumns, refundFilterFields } from "./queueConfig";

/**
 * The refund queue screen: a Ledger list view (URL-driven filters, sortable
 * table, counted status tabs, pagination) configured with refund columns,
 * refund filters and the refund status vocabulary.
 */

const BASE_PATH = "/refunds";

const PARAM_KEYS = [
  "q",
  "status",
  "reason",
  "method",
  "minAmount",
  "maxAmount",
  "from",
  "to",
  "flagged",
  "sort",
  "dir",
  "page",
] as const;

export function RefundQueueScreen({
  actor,
  searchParams,
}: {
  actor: Actor;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations · Refunds"
        title="Refund queue"
        description="Review refund requests, check risk signals, and record an auditable decision."
      />
      <Suspense
        fallback={
          <Card dense>
            <TableSkeleton rows={10} columns={7} />
          </Card>
        }
      >
        <RefundQueue actor={actor} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RefundQueue({
  actor,
  searchParams,
}: {
  actor: Actor;
  searchParams: Promise<SearchParams>;
}) {
  const params = readListParams(await searchParams, PARAM_KEYS);
  const { page, counts, sort, flagsById } = listRefundQueue(actor, params);
  const openValue = page.items
    .filter(
      (refund) => refund.status === "PENDING" || refund.status === "ESCALATED",
    )
    .reduce((total, refund) => total + refund.requestedAmountCents, 0);

  return (
    <>
      <StatusTabs tabs={statusTabs(params, counts)} />

      <Card
        dense
        title={`${page.total} matching request${page.total === 1 ? "" : "s"}`}
        actions={
          <span className="text-[12px] text-muted">
            Open value on this page:{" "}
            <strong className="text-ink">{formatMoney(openValue)}</strong>
          </span>
        }
        className="mt-4"
      >
        <FilterBar
          fields={refundFilterFields}
          basePath={BASE_PATH}
          preserve={["sort", "dir"]}
        />
        <DataTable
          columns={refundColumns(flagsById)}
          rows={page.items}
          rowKey={(refund) => refund.id}
          rowHref={(refund) => `${BASE_PATH}/${refund.id}`}
          sort={sort}
          sortHref={(key, direction) =>
            listHref(BASE_PATH, params, {
              sort: key,
              dir: direction,
              page: undefined,
            })
          }
          empty={{
            title: "No refunds match these filters",
            description:
              "Try clearing a filter or widening the requested date range.",
          }}
        />
        {page.total > 0 && (
          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            total={page.total}
            pageSize={page.pageSize}
            hrefForPage={(next) =>
              listHref(BASE_PATH, params, { page: String(next) })
            }
          />
        )}
      </Card>
    </>
  );
}

function statusTabs(
  params: ListParams,
  counts: Record<string, number>,
): StatusTab[] {
  const tabHref = (status: string | undefined) =>
    listHref(BASE_PATH, params, { status, page: undefined });

  return [
    {
      key: "all",
      label: "All",
      count: Object.values(counts).reduce((a, b) => a + b, 0),
      href: tabHref(undefined),
      active: !params.status,
    },
    ...REFUND_STATUSES.map((status) => ({
      key: status,
      label: REFUND_STATUS_DESCRIPTORS[status].label,
      count: counts[status] ?? 0,
      href: tabHref(status),
      active: params.status === status,
    })),
  ];
}
