# `src/ledger` — the platform

Everything in this directory is **application-agnostic**. It knows about actors,
permissions, tables, filters, audit events and navigation; it does not know that
refunds exist. That rule is enforced by ESLint: `src/ledger/**` may not import
`@/apps/**` or `@/platform/**`.

| Module | What it owns |
| --- | --- |
| `apps/registry.ts` | The `LedgerApp` manifest: an application's nav, permissions and `install()`. Derives the sidebar and the permission matrix. |
| `auth/` | Roles, the `Actor`, `can()`/`requirePermission()`, and `buildAccessPolicy()` which merges app-declared permissions into one map. Session resolution is cookie-based in the prototype. |
| `action/defineAction.ts` | The only way to mutate: validate (zod) → authorize → run the handler → audit, including `DENIED` and `REJECTED_BY_RULE` outcomes. |
| `audit/` | The append-only event log and its timeline component. |
| `data/` | The database handle, the platform schema (`users`, `audit_events`), `applySchema()` for application schemas, and `defineQuery`/`buildWhere` for filtered, sorted, paginated reads. |
| `shell/` | `AppShell`, the permission-filtered `SideNav`, the sign-out control. |
| `ui/` | `DataTable`, `Pagination`, `FilterBar`, `StatusTabs`, `StatusBadge`, `ConfirmDialog`, `Card`/`PageHeader`/`DescriptionList`, form fields, empty/error/skeleton states, `Forbidden`, `listView.ts` (the query-string contract) and money/date formatting. |
| `admin/` | The platform's own application: audit log and access-control screens, registered through the same manifest shape as a business app. |

## What an application supplies

- **A manifest** (`LedgerApp`): nav items, permission definitions with the roles
  that receive them, and an optional `install()` that creates its tables.
- **Its own vocabulary**: statuses, reasons, badges' descriptors, columns,
  filter fields, business rules. The platform renders these; it never defines
  them.

## What the platform never contains

Domain nouns (refund, chargeback, dispute), domain statuses, domain permissions,
domain tables, or an entry per application in any hard-coded list. The single
place applications are named is the composition root, `src/platform/`.
