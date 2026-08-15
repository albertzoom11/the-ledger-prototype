import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "./primitives";

/**
 * Ledger platform UI kit: dense, sortable, server-rendered table.
 *
 * Applications describe columns declaratively; sorting is expressed as URL
 * state so the table stays a server component and links are shareable.
 */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortKey?: string;
  align?: "left" | "right";
  width?: string;
  hideBelow?: "sm" | "md" | "lg";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  sort?: { key: string; direction: "asc" | "desc" };
  /** Builds the href for toggling a column's sort. */
  sortHref?: (key: string, direction: "asc" | "desc") => string;
  empty?: { title: string; description?: string };
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  sort,
  sortHref,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? "No records"}
        description={empty?.description}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-line bg-canvas">
            {columns.map((column) => {
              const isSorted = sort && column.sortKey === sort.key;
              const nextDirection =
                isSorted && sort?.direction === "desc" ? "asc" : "desc";
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={clsx(
                    "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted",
                    column.align === "right" && "text-right",
                    hideClass(column.hideBelow),
                  )}
                >
                  {column.sortKey && sortHref ? (
                    <Link
                      href={sortHref(column.sortKey, nextDirection)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {column.header}
                      <span className={isSorted ? "text-accent" : "text-line"}>
                        {isSorted ? (sort?.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </Link>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                className="group hover:bg-[#f9fbff] focus-within:bg-[#f9fbff]"
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={clsx(
                      "px-3 py-2 align-middle",
                      column.align === "right" && "text-right",
                      hideClass(column.hideBelow),
                    )}
                  >
                    {href && index === 0 ? (
                      <Link href={href} className="block hover:text-accent">
                        {column.render(row)}
                      </Link>
                    ) : (
                      column.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function hideClass(hideBelow?: "sm" | "md" | "lg"): string | undefined {
  if (!hideBelow) return undefined;
  return {
    sm: "hidden sm:table-cell",
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
  }[hideBelow];
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-muted">
      <span>
        Showing <strong className="text-ink">{first}</strong>–
        <strong className="text-ink">{last}</strong> of{" "}
        <strong className="text-ink">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <PageLink href={hrefForPage(page - 1)} disabled={page <= 1}>
          Previous
        </PageLink>
        <span className="px-2">
          Page {page} of {pageCount}
        </span>
        <PageLink href={hrefForPage(page + 1)} disabled={page >= pageCount}>
          Next
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded border border-line px-2 py-1 text-line">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded border border-line bg-surface px-2 py-1 text-ink hover:bg-canvas"
    >
      {children}
    </Link>
  );
}
