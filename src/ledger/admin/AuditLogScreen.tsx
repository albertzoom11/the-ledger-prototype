import { listAuditEntityTypes, queryAuditEvents } from "../audit/auditLog";
import { AuditTimeline } from "../audit/AuditTimeline";
import type { Actor } from "../auth/actor";
import { can } from "../auth/actor";
import type { Filter } from "../data/repository";
import { Pagination } from "../ui/DataTable";
import { FilterBar } from "../ui/FilterBar";
import { Forbidden } from "../ui/Forbidden";
import { titleCase } from "../ui/format";
import {
  listHref,
  parsePage,
  readListParams,
  type SearchParams,
} from "../ui/listView";
import { Card, PageHeader } from "../ui/primitives";

/**
 * Platform screen: the audit log across every installed application. It is
 * entity-type agnostic — the filter options come from what the log contains, not
 * from a hard-coded list of applications.
 */

const PARAM_KEYS = ["q", "outcome", "entityType", "page"] as const;
const BASE_PATH = "/admin/audit";

export async function AuditLogScreen({
  actor,
  searchParams,
}: {
  actor: Actor;
  searchParams: Promise<SearchParams>;
}) {
  if (!can(actor, "audit:view")) {
    return <Forbidden permission="audit:view" role={actor.role} />;
  }

  const params = readListParams(await searchParams, PARAM_KEYS);
  const entityTypes = listAuditEntityTypes();

  const filters: Filter[] = [];
  if (params.q) {
    filters.push({
      op: "search",
      columns: ["a.entity_id", "a.action", "a.metadata", "u.name"],
      value: params.q,
    });
  }
  if (params.outcome) {
    filters.push({ column: "a.outcome", op: "=", value: params.outcome });
  }
  if (params.entityType) {
    filters.push({ column: "a.entity_type", op: "=", value: params.entityType });
  }

  const page = queryAuditEvents({
    filters,
    page: { page: parsePage(params.page), pageSize: 25 },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Platform · Admin"
        title="Audit log"
        description="Append-only record of every action across all Ledger applications, including denied attempts."
      />
      <Card dense title={`${page.total} events`}>
        <FilterBar
          basePath={BASE_PATH}
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
              options: entityTypes.map((entityType) => ({
                value: entityType,
                label: titleCase(entityType),
              })),
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
            hrefForPage={(next) =>
              listHref(BASE_PATH, params, { page: String(next) })
            }
          />
        )}
      </Card>
    </div>
  );
}
