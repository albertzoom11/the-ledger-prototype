import { listAuditEvents } from "../audit/auditService";
import { AuditTimeline } from "../audit/AuditTimeline";
import type { Actor } from "../auth/actor";
import { ForbiddenError } from "../auth/actor";
import { Pagination } from "../ui/DataTable";
import { FilterBar } from "../ui/FilterBar";
import { Forbidden } from "../ui/Forbidden";
import { titleCase } from "../ui/format";
import { listHref, readListParams, type SearchParams } from "../ui/listView";
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
  const params = readListParams(await searchParams, PARAM_KEYS);

  // The service is the enforcement point; the screen only renders the denial.
  let view;
  try {
    view = listAuditEvents(actor, params);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <Forbidden permission={error.permission} role={actor.role} />;
    }
    throw error;
  }
  const { page, entityTypes } = view;

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
