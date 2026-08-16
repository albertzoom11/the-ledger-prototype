/**
 * Ledger platform UI kit: the URL contract for list views.
 *
 * Every Ledger list view keeps its search, filters, sort and page in the query
 * string, so views are shareable and the server does the filtering. These
 * helpers are the shared implementation of that contract: read params, resolve a
 * sort against a whitelist, and rebuild the URL when something changes.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListParams = Record<string, string | undefined>;

export function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) || undefined;
}

/** Picks the known keys out of untrusted search params. */
export function readListParams(
  params: SearchParams,
  keys: readonly string[],
): ListParams {
  const result: ListParams = {};
  for (const key of keys) result[key] = readParam(params, key);
  return result;
}

export interface SortState<TSortKey extends string> {
  key: TSortKey;
  direction: "asc" | "desc";
}

/**
 * Resolves `?sort=&dir=` against the keys a view actually supports, so an
 * arbitrary sort param can never reach the query layer.
 */
export function resolveSort<TSortKey extends string>(
  allowed: readonly TSortKey[],
  params: { sort?: string; dir?: string },
  fallback: SortState<TSortKey>,
): SortState<TSortKey> {
  const key = allowed.includes(params.sort as TSortKey)
    ? (params.sort as TSortKey)
    : fallback.key;
  const direction =
    params.dir === "asc" ? "asc" : params.dir === "desc" ? "desc" : fallback.direction;
  return { key, direction };
}

/** Builds `basePath?…` preserving the current params, with overrides applied. */
export function listHref(
  basePath: string,
  params: ListParams,
  overrides: ListParams = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function parsePage(value: string | undefined): number {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

/** `"12.50"` → `1250`. Currency inputs are decimal; storage is minor units. */
export function parseMoneyToCents(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
