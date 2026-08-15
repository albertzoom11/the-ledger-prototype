"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "./primitives";

/**
 * Ledger platform UI kit: declarative filter bar backed by URL search params.
 *
 * Filters live in the URL so every list view is shareable, bookmarkable and
 * server-filtered. Applications only provide field descriptors.
 */

export type FilterField =
  | { kind: "search"; name: string; label: string; placeholder?: string }
  | {
      kind: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      anyLabel?: string;
    }
  | { kind: "date"; name: string; label: string }
  | { kind: "number"; name: string; label: string; placeholder?: string; step?: string };

export function FilterBar({
  fields,
  basePath,
  preserve = [],
}: {
  fields: FilterField[];
  basePath: string;
  /** Params that survive a filter change (e.g. sort). */
  preserve?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of fields) values[field.name] = searchParams.get(field.name) ?? "";
    return values;
  }, [fields, searchParams]);

  const [draft, setDraft] = useState<Record<string, string>>(current);
  const [dirtyKey, setDirtyKey] = useState(searchParams.toString());

  // Re-sync when the URL changes outside this component (back button, links).
  const urlKey = searchParams.toString();
  if (urlKey !== dirtyKey) {
    setDirtyKey(urlKey);
    setDraft(current);
  }

  const apply = useCallback(
    (values: Record<string, string>) => {
      const params = new URLSearchParams();
      for (const key of preserve) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
      for (const [key, value] of Object.entries(values)) {
        if (value.trim()) params.set(key, value.trim());
      }
      const query = params.toString();
      startTransition(() => router.push(query ? `${basePath}?${query}` : basePath));
    },
    [basePath, preserve, router, searchParams],
  );

  const activeCount = Object.values(current).filter((value) => value).length;

  return (
    <form
      className="flex flex-wrap items-end gap-2 border-b border-line bg-canvas px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        apply(draft);
      }}
    >
      {fields.map((field) => (
        <label key={field.name} className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {field.label}
          </span>
          {field.kind === "select" ? (
            <select
              name={field.name}
              value={draft[field.name] ?? ""}
              onChange={(event) => {
                const next = { ...draft, [field.name]: event.target.value };
                setDraft(next);
                apply(next);
              }}
              className="h-8 min-w-[150px] rounded border border-line bg-surface px-2 text-[13px] text-ink"
            >
              <option value="">{field.anyLabel ?? "Any"}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.kind === "search" ? "search" : field.kind}
              step={field.kind === "number" ? (field.step ?? "0.01") : undefined}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              value={draft[field.name] ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, [field.name]: event.target.value })
              }
              className={
                field.kind === "search"
                  ? "h-8 w-72 rounded border border-line bg-surface px-2 text-[13px] text-ink"
                  : "h-8 w-36 rounded border border-line bg-surface px-2 text-[13px] text-ink"
              }
            />
          )}
        </label>
      ))}

      <div className="flex items-center gap-2 pb-0.5">
        <Button type="submit" variant="primary" size="sm">
          {isPending ? "Applying…" : "Apply"}
        </Button>
        {activeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft({});
              apply({});
            }}
          >
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </form>
  );
}
