import { forbidden403 } from "@/app/admin/forbidden";
import { getCurrentActor } from "@/ledger/auth/session";
import { can } from "@/ledger/auth/actor";
import { queryAuditEvents } from "@/ledger/audit/auditLog";
import { AuditTimeline } from "@/ledger/audit/AuditTimeline";
import { FilterBar } from "@/ledger/ui/FilterBar";
import { Pagination } from "@/ledger/ui/DataTable";
import { Card, PageHeader } from "@/ledger/ui/primitives";
import type { Filter } from "@/ledger/data/repository";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await getCurrentActor();
  if (!can(actor, "audit:view")) {
    return forbidden403("audit:view", actor.role);
  }

  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };

  const filters: Filter[] = [];
  if (single("q")) {
    filters.push({
      op: "search",
      columns: ["a.entity_id", "a.action", "a.metadata", "u.name"],
      value: single("q"),
    });
  }
  if (single("outcome")) {
    filters.push({ column: "a.outcome", op: "=", value: single("outcome") });
  }
  if (single("entityType")) {
    filters.push({ column: "a.entity_type", op: "=", value: single("entityType") });
  }

  const page = queryAuditEvents({
    filters,
    page: { page: Number(single("page")) || 1, pageSize: 25 },
  });

  const hrefForPage = (next: number) => {
    const query = new URLSearchParams();
    for (const key of ["q", "outcome", "entityType"]) {
      if (single(key)) query.set(key, single(key));
    }
    query.set("page", String(next));
    return `/admin/audit?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Platform · Admin"
        title="Audit log"
        description="Append-only record of every action across all Ledger applications, including denied attempts."
      />
      <Card dense title={`${page.total} events`}>
        <FilterBar
          basePath="/admin/audit"
          fields={[
            {
              kind: "search",
              name: "q",
              label: "Search",
              placeholder: "Entity id, action, actor, metadata…",
            },
            {
              kind: "select",
              name: "outcome",
              label: "Outcome",
              anyLabel: "All outcomes",
              options: [
                { value: "SUCCESS", label: "Success" },
                { value: "DENIED", label: "Denied" },
                { value: "REJECTED_BY_RULE", label: "Rejected by rule" },
              ],
            },
            {
              kind: "select",
              name: "entityType",
              label: "Entity",
              anyLabel: "All entities",
              options: [{ value: "refund", label: "Refund" }],
            },
          ]}
        />
        <AuditTimeline events={page.items} />
        {page.total > 0 && (
          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            total={page.total}
            pageSize={page.pageSize}
            hrefForPage={hrefForPage}
          />
        )}
      </Card>
    </div>
  );
}
