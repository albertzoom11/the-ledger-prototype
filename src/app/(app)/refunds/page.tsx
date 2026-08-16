import { Suspense } from "react";
import Link from "next/link";
import clsx from "clsx";
import { requireActor } from "@/ledger/auth/session";
import { DataTable, Pagination } from "@/ledger/ui/DataTable";
import { FilterBar } from "@/ledger/ui/FilterBar";
import { Card, PageHeader, TableSkeleton } from "@/ledger/ui/primitives";
import { formatMoney } from "@/ledger/ui/format";
import {
  listRefundQueue,
  type RefundQueueQuery,
} from "@/apps/refunds/service/refundQueries";
import {
  REFUND_STATUSES,
  REFUND_STATUS_DESCRIPTORS,
} from "@/apps/refunds/domain/types";
import { refundColumns, refundFilterFields } from "@/apps/refunds/ui/queueConfig";

type SearchParams = Record<string, string | string[] | undefined>;

function toQuery(params: SearchParams): RefundQueueQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    q: single("q"),
    status: single("status"),
    reason: single("reason"),
    method: single("method"),
    minAmount: single("minAmount"),
    maxAmount: single("maxAmount"),
    from: single("from"),
    to: single("to"),
    flagged: single("flagged"),
    sort: single("sort"),
    dir: single("dir"),
    page: single("page"),
  };
}

function hrefWith(query: RefundQueueQuery, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...overrides })) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/refunds?${search}` : "/refunds";
}

export default async function RefundQueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = toQuery(await searchParams);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations · Refunds"
        title="Refund queue"
        description="Review refund requests, check risk signals, and record an auditable decision."
      />
      <Suspense
        key={JSON.stringify(query)}
        fallback={
          <Card dense>
            <TableSkeleton rows={10} columns={7} />
          </Card>
        }
      >
        <RefundQueue query={query} />
      </Suspense>
    </div>
  );
}

async function RefundQueue({ query }: { query: RefundQueueQuery }) {
  const actor = await requireActor("/refunds");
  const { page, counts, sort, flagsById } = listRefundQueue(actor, query);
  const openValue = page.items
    .filter((refund) => refund.status === "PENDING" || refund.status === "ESCALATED")
    .reduce((total, refund) => total + refund.requestedAmountCents, 0);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <StatusTab
          label="All"
          count={Object.values(counts).reduce((a, b) => a + b, 0)}
          href={hrefWith(query, { status: undefined, page: undefined })}
          active={!query.status}
        />
        {REFUND_STATUSES.map((status) => (
          <StatusTab
            key={status}
            label={REFUND_STATUS_DESCRIPTORS[status].label}
            count={counts[status]}
            href={hrefWith(query, { status, page: undefined })}
            active={query.status === status}
          />
        ))}
      </div>

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
          basePath="/refunds"
          preserve={["sort", "dir"]}
        />
        <DataTable
          columns={refundColumns(flagsById)}
          rows={page.items}
          rowKey={(refund) => refund.id}
          rowHref={(refund) => `/refunds/${refund.id}`}
          sort={sort}
          sortHref={(key, direction) =>
            hrefWith(query, { sort: key, dir: direction, page: undefined })
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
            hrefForPage={(next) => hrefWith(query, { page: String(next) })}
          />
        )}
      </Card>
    </>
  );
}

function StatusTab({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-baseline gap-2 rounded border px-3 py-1.5",
        active
          ? "border-accent bg-accent/5 text-accent"
          : "border-line bg-surface text-ink hover:bg-canvas",
      )}
    >
      <span className="text-[12px] font-medium">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{count}</span>
    </Link>
  );
}
