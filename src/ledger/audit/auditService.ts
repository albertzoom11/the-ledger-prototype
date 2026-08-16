import { requirePermission, type Actor } from "../auth/actor";
import type { Filter, Page } from "../data/repository";
import { parsePage, type ListParams } from "../ui/listView";
import {
  AUDIT_OUTCOMES,
  listAuditEntityTypes,
  queryAuditEvents,
  type AuditEvent,
} from "./auditLog";

/**
 * Read-side of the audit log. Reads are authorised here rather than in the
 * screen, so a caller without `audit:view` cannot list events by importing this
 * module, hitting the route directly, or rendering the screen some other way.
 */

export const AUDIT_PAGE_SIZE = 25;

export interface AuditLogView {
  page: Page<AuditEvent>;
  entityTypes: string[];
}

export function listAuditEvents(actor: Actor, params: ListParams): AuditLogView {
  requirePermission(actor, "audit:view");

  const filters: Filter[] = [];
  if (params.q?.trim()) {
    filters.push({
      op: "search",
      columns: ["a.entity_id", "a.action", "a.metadata", "u.name"],
      value: params.q,
    });
  }
  // Outcomes are an allowlist: an arbitrary ?outcome= never reaches the query.
  if (params.outcome && (AUDIT_OUTCOMES as readonly string[]).includes(params.outcome)) {
    filters.push({ column: "a.outcome", op: "=", value: params.outcome });
  }
  if (params.entityType?.trim()) {
    filters.push({ column: "a.entity_type", op: "=", value: params.entityType });
  }

  return {
    page: queryAuditEvents({
      filters,
      page: { page: parsePage(params.page), pageSize: AUDIT_PAGE_SIZE },
    }),
    entityTypes: listAuditEntityTypes(),
  };
}
