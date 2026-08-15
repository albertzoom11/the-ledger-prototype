import type { Database } from "better-sqlite3";
import { getDb } from "./db";

/**
 * Ledger platform: minimal, typed data-access primitives.
 *
 * Every application reads through `defineQuery` / `Repository` so that
 * filtering, sorting and pagination behave identically across tools and there
 * is exactly one place to add caching, tracing or a different backing store.
 */

export type Row = Record<string, string | number | null>;
export type SqlParam = string | number | null;

export type Filter =
  | { column: string; op: "="; value: SqlParam }
  | { column: string; op: "!="; value: SqlParam }
  | { column: string; op: ">=" | "<="; value: SqlParam }
  | { column: string; op: "in"; value: SqlParam[] }
  | { column: string; op: "like"; value: string }
  | { columns: string[]; op: "search"; value: string };

export interface SortSpec<TSortKey extends string = string> {
  key: TSortKey;
  direction: "asc" | "desc";
}

export interface PageSpec {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface WhereClause {
  sql: string;
  params: SqlParam[];
}

/** Builds a parameterised WHERE clause. Values are never interpolated. */
export function buildWhere(filters: Filter[]): WhereClause {
  const parts: string[] = [];
  const params: SqlParam[] = [];

  for (const filter of filters) {
    if (filter.op === "search") {
      const term = `%${filter.value.trim().toLowerCase()}%`;
      parts.push(
        `(${filter.columns.map((c) => `LOWER(${c}) LIKE ?`).join(" OR ")})`,
      );
      filter.columns.forEach(() => params.push(term));
      continue;
    }
    if (filter.op === "in") {
      if (filter.value.length === 0) {
        parts.push("1 = 0");
        continue;
      }
      parts.push(`${filter.column} IN (${filter.value.map(() => "?").join(", ")})`);
      params.push(...filter.value);
      continue;
    }
    if (filter.op === "like") {
      parts.push(`LOWER(${filter.column}) LIKE ?`);
      params.push(`%${filter.value.trim().toLowerCase()}%`);
      continue;
    }
    parts.push(`${filter.column} ${filter.op} ?`);
    params.push(filter.value);
  }

  return {
    sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params,
  };
}

export function clampPage(spec: Partial<PageSpec> | undefined): PageSpec {
  const pageSize = Math.min(Math.max(spec?.pageSize ?? 25, 5), 100);
  const page = Math.max(spec?.page ?? 1, 1);
  return { page, pageSize };
}

export interface QueryDefinition<TEntity, TSortKey extends string> {
  /** SELECT list + FROM/JOINs, without WHERE/ORDER/LIMIT. */
  select: string;
  /** SELECT COUNT(*) variant of the same FROM/JOINs. */
  count: string;
  /** Whitelist of sortable columns, keyed by the public sort key. */
  sortColumns: Record<TSortKey, string>;
  defaultSort: SortSpec<TSortKey>;
  map: (row: Row) => TEntity;
}

export interface QueryInput<TSortKey extends string> {
  filters?: Filter[];
  sort?: SortSpec<TSortKey>;
  page?: Partial<PageSpec>;
}

/**
 * Creates a reusable, paginated list query with a sort whitelist so no caller
 * can inject SQL through a sort parameter.
 */
export function defineQuery<TEntity, TSortKey extends string>(
  definition: QueryDefinition<TEntity, TSortKey>,
) {
  return function run(
    input: QueryInput<TSortKey> = {},
    db: Database = getDb(),
  ): Page<TEntity> {
    const where = buildWhere(input.filters ?? []);
    const { page, pageSize } = clampPage(input.page);
    const sort = input.sort ?? definition.defaultSort;
    const sortColumn =
      definition.sortColumns[sort.key] ??
      definition.sortColumns[definition.defaultSort.key];
    const direction = sort.direction === "asc" ? "ASC" : "DESC";

    const rows = db
      .prepare<SqlParam[], Row>(
        `${definition.select} ${where.sql} ORDER BY ${sortColumn} ${direction} LIMIT ? OFFSET ?`,
      )
      .all(...where.params, pageSize, (page - 1) * pageSize);

    const countRow = db
      .prepare<SqlParam[], { total: number }>(`${definition.count} ${where.sql}`)
      .get(...where.params);
    const total = countRow?.total ?? 0;

    return {
      items: rows.map(definition.map),
      total,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
    };
  };
}

/** Small helpers for single-row reads and writes. */
export function selectOne<TEntity>(
  sql: string,
  params: SqlParam[],
  map: (row: Row) => TEntity,
  db: Database = getDb(),
): TEntity | null {
  const row = db.prepare<SqlParam[], Row>(sql).get(...params);
  return row ? map(row) : null;
}

export function selectAll<TEntity>(
  sql: string,
  params: SqlParam[],
  map: (row: Row) => TEntity,
  db: Database = getDb(),
): TEntity[] {
  return db
    .prepare<SqlParam[], Row>(sql)
    .all(...params)
    .map(map);
}

/** Returns the number of affected rows, so callers can guard conditional writes. */
export function execute(
  sql: string,
  params: SqlParam[],
  db: Database = getDb(),
): number {
  return db.prepare<SqlParam[]>(sql).run(...params).changes;
}

export function requireString(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column "${key}"`);
  }
  return value;
}

export function requireNumber(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new Error(`Expected numeric column "${key}"`);
  }
  return value;
}

export function optionalString(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}
