import clsx from "clsx";
import type { AuditEvent, AuditOutcome } from "./auditLog";
import { formatDateTime, formatRelative, titleCase } from "../ui/format";
import { EmptyState } from "../ui/primitives";

/** Ledger platform UI kit: audit trail for any entity. */

const OUTCOME_STYLE: Record<AuditOutcome, string> = {
  SUCCESS: "border-emerald-300 bg-emerald-50 text-emerald-800",
  DENIED: "border-red-300 bg-red-50 text-red-800",
  REJECTED_BY_RULE: "border-amber-300 bg-amber-50 text-amber-900",
};

export function AuditTimeline({
  events,
}: {
  events: (AuditEvent & { actorName: string })[];
}) {
  if (events.length === 0) {
    return <EmptyState title="No audit events yet" />;
  }

  return (
    <ol className="divide-y divide-line">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 px-4 py-2.5">
          <div className="w-28 shrink-0 text-[11px] text-muted">
            <div>{formatDateTime(event.timestamp)}</div>
            <div>{formatRelative(event.timestamp)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-ink">
                {titleCase(event.action.replace(/^[a-z]+\./, ""))}
              </span>
              <span
                className={clsx(
                  "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  OUTCOME_STYLE[event.outcome],
                )}
              >
                {event.outcome.replace(/_/g, " ")}
              </span>
              <span className="text-[12px] text-muted">
                by {event.actorName} ({titleCase(event.actorRole)})
              </span>
            </div>
            {Object.keys(event.metadata).length > 0 && (
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-1">
                    <dt className="font-medium">{key}:</dt>
                    <dd className="max-w-[420px] truncate">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
