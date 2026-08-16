import { randomUUID } from "node:crypto";
import type { Role } from "../auth/roles";
import {
  Filter,
  Row,
  defineQuery,
  execute,
  optionalString,
  requireString,
} from "../data/repository";

/**
 * Ledger platform: append-only audit log shared by every application.
 *
 * Any entity type can be audited; consumers never write to the table directly.
 */

export type AuditOutcome = "SUCCESS" | "DENIED" | "REJECTED_BY_RULE";

/** Sign-in attempts are audited before an identity exists, hence ANONYMOUS. */
export type AuditActorRole = Role | "ANONYMOUS";

export const ANONYMOUS_ACTOR = { id: "anonymous", role: "ANONYMOUS" } as const;

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: AuditActorRole;
  outcome: AuditOutcome;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface AuditDraft {
  entityType: string;
  entityId: string;
  action: string;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
}

function mapAuditEvent(row: Row): AuditEvent {
  const raw = requireString(row, "metadata");
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  return {
    id: requireString(row, "id"),
    entityType: requireString(row, "entity_type"),
    entityId: requireString(row, "entity_id"),
    action: requireString(row, "action"),
    actorId: requireString(row, "actor_id"),
    actorRole: requireString(row, "actor_role") as AuditActorRole,
    outcome: requireString(row, "outcome") as AuditOutcome,
    timestamp: requireString(row, "timestamp"),
    metadata:
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {},
  };
}

export function recordAuditEvent(
  draft: AuditDraft,
  actor: { id: string; role: AuditActorRole },
  timestamp: string = new Date().toISOString(),
): AuditEvent {
  const event: AuditEvent = {
    id: `ae_${randomUUID().slice(0, 12)}`,
    entityType: draft.entityType,
    entityId: draft.entityId,
    action: draft.action,
    actorId: actor.id,
    actorRole: actor.role,
    outcome: draft.outcome ?? "SUCCESS",
    timestamp,
    metadata: draft.metadata ?? {},
  };

  execute(
    `INSERT INTO audit_events
       (id, entity_type, entity_id, action, actor_id, actor_role, outcome, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.entityType,
      event.entityId,
      event.action,
      event.actorId,
      event.actorRole,
      event.outcome,
      event.timestamp,
      JSON.stringify(event.metadata),
    ],
  );

  return event;
}

const AUDIT_SELECT = `SELECT a.id, a.entity_type, a.entity_id, a.action, a.actor_id,
    a.actor_role, a.outcome, a.timestamp, a.metadata,
    COALESCE(u.name, a.actor_id) AS actor_name
  FROM audit_events a
  LEFT JOIN users u ON u.id = a.actor_id`;

export type AuditSortKey = "timestamp" | "action" | "entity";

export const queryAuditEvents = defineQuery<
  AuditEvent & { actorName: string },
  AuditSortKey
>({
  select: AUDIT_SELECT,
  count: `SELECT COUNT(*) AS total FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id`,
  sortColumns: {
    timestamp: "a.timestamp",
    action: "a.action",
    entity: "a.entity_type",
  },
  defaultSort: { key: "timestamp", direction: "desc" },
  map: (row) => ({
    ...mapAuditEvent(row),
    actorName: optionalString(row, "actor_name") ?? requireString(row, "actor_id"),
  }),
});

export function auditTrailFor(
  entityType: string,
  entityId: string,
): (AuditEvent & { actorName: string })[] {
  const filters: Filter[] = [
    { column: "a.entity_type", op: "=", value: entityType },
    { column: "a.entity_id", op: "=", value: entityId },
  ];
  return queryAuditEvents({
    filters,
    sort: { key: "timestamp", direction: "desc" },
    page: { page: 1, pageSize: 100 },
  }).items;
}
