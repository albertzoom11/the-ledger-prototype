# The Ledger

The Ledger is an internal-tools **platform** for a fintech operations org: a single
workspace where every internal application shares the same shell, table/filter/form
primitives, role model, audit log and data-access patterns. The point is that the
tenth internal tool should cost a fraction of the first.

The **Refunds Dashboard** is the first application built on it, and it exists to prove
that the platform primitives are real: it is written as a *consumer* of `src/ledger/*`,
with almost no bespoke infrastructure of its own.

## What the refunds application demonstrates

A reviewer works the full loop end to end:

1. Open the refund queue with per-status counts and open-value on the page.
2. Search (customer, email, refund id, transaction id, requester note), filter
   (status, reason, payment method, risk signal, amount range, date range), sort any
   column — all server-side, all reflected in the URL.
3. Open a refund and see transaction, customer and recent-activity context.
4. Read derived **risk signals**: exceeds original charge, high value, duplicate
   request on the same transaction, repeat requester, high-risk customer, suspected
   fraud, SLA breach.
5. Approve / reject / escalate, with a confirmation dialog and a required note where
   policy demands one.
6. The state transition, the actor, and the note land in the append-only audit log —
   and so do **denied** and **rule-rejected** attempts.
7. The queue reflects the new state immediately.

Business rules enforced in the service layer (not the UI):

| Rule | Behaviour |
| --- | --- |
| High value (≥ $500) | Reviewer cannot approve; must escalate. Admin can approve. |
| Note required | Rejections, escalations and high-value approvals need ≥ 15 characters. |
| Over-refund | Cannot approve more than the original transaction amount. |
| Terminal states | `APPROVED` / `REJECTED` are immutable. |
| Valid transitions | `PENDING → APPROVED / REJECTED / ESCALATED`, `ESCALATED → APPROVED / REJECTED`. |

### Role-aware behaviour (how to see it in 30 seconds)

Use the **Signed in as** switcher in the header.

- As **Priya Raman (Reviewer)**: open a refund with the "High value" signal — *Approve*
  is disabled with the reason shown, *Escalate* works, and `/admin/audit` returns a
  server-rendered **403** even if you navigate to the URL directly.
- As **Sam Ortega (Admin)**: the same refund can be approved, and the Platform section
  of the sidebar appears (audit log + permission matrix).

The switcher only sets a cookie. The server re-resolves the actor and re-checks
permissions on every read and every mutation, so nothing here is UI-only authorization.

## Architecture

Single Next.js (App Router) process, TypeScript, Tailwind, SQLite. Server Components
read through the service layer; mutations are Server Actions that delegate to audited
business actions.

```
src/
  ledger/                     the platform — app-agnostic, knows no domain nouns
    apps/       LedgerApp manifest: nav + permissions + install(); nav/matrix derivation
    auth/       roles, Actor, can()/requirePermission(), buildAccessPolicy()
    action/     defineAction(): validate → authorize → run rules → audit
    audit/      append-only audit log + AuditTimeline
    data/       db handle, platform schema (users, audit_events), applySchema(),
                defineQuery/buildWhere (filter, sort, paginate)
    shell/      AppShell, permission-filtered SideNav, identity switcher
    ui/         DataTable, Pagination, FilterBar, StatusTabs, StatusBadge,
                ConfirmDialog, Card/PageHeader/DescriptionList, form fields,
                Empty/Error/Skeleton/Forbidden, listView.ts (URL contract),
                money & date formatting
    admin/      the platform's own app: audit log + access-control screens
  platform/                   composition root — the only place apps are named
    apps.ts     INSTALLED_APPS
    access.ts   the access policy built from the installed apps + getActor()
    bootstrap.ts installs each app's schema
  apps/
    refunds/                  the first application
      app.ts      its manifest: nav, permissions + role grants, schema install
      domain/     status model, transitions, rules, risk signals (pure, tested)
      data/       its own tables (schema.ts) + queries built on defineQuery
      service/    read + write use cases; server actions are a thin transport
      ui/         its screens + table/filter *configuration* + decision panel
  app/                        routes only: resolve the actor, render a screen
scripts/seed.ts               deterministic synthetic dataset
```

`src/ledger/README.md` is the module-by-module reference. The boundary is enforced,
not just documented: ESLint forbids `src/ledger/**` from importing `@/apps/**` or
`@/platform/**`, so platform code cannot quietly grow a dependency on an application.

Three deliberate boundaries:

- **`defineAction` owns the cross-cutting concerns.** A mutation gets zod validation of
  untrusted input, `requirePermission`, rule execution and an audit event — including
  `DENIED` / `REJECTED_BY_RULE` outcomes — because the wrapper does it, not because the
  author remembered to.
- **Rules are pure.** `apps/refunds/domain/rules.ts` has no I/O and no server-only
  imports, so the same `checkDecision` powers the UI's explanations and the server's
  enforcement, and it is unit-tested directly.
- **Data access is declarative.** `defineQuery` supplies filtering, sorting (against a
  column whitelist, so sort params can't inject SQL) and pagination once, for every list
  view in every future application.

### The reusable primitives

These are the parts a second internal application would reuse as-is:

| Primitive | Why it is platform, not refunds |
| --- | --- |
| `DataTable` + `Pagination` | Column definitions, sortable headers, row links, empty state. Columns are *data*; refunds supplies its own in `apps/refunds/ui/queueConfig.tsx`. |
| `FilterBar` + `ui/listView.ts` | One query-string contract for every list view: read params, resolve `?sort=&dir=` against a whitelist, rebuild URLs. Shareable URLs, server-side filtering, no client state. |
| `StatusTabs` / `StatusBadge` | Counted tabs and coloured pills. The *vocabulary* (`PENDING`, `ESCALATED`, …) belongs to the application, which passes descriptors in. |
| `defineQuery` / `buildWhere` | Filtering, sorting against a column whitelist and pagination, once. |
| `defineAction` | Validation, authorization and auditing for every mutation, structurally. |
| Access policy (`auth/access.ts`) | Roles are platform; permission *strings* are declared by each app together with the roles that get them. `/admin/access` renders whatever is installed. |
| `AppShell` + `SideNav` | Layout, identity switcher, and navigation filtered by the actor's permissions. |
| Audit log + `AuditTimeline` | Entity-agnostic (`entityType`/`entityId`); the admin audit screen builds its filters from what the log contains. |
| `Card`, `PageHeader`, `DescriptionList`, form fields, `Forbidden`, skeletons | The shared visual language, so two internal tools do not look like two products. |

### Adding a second application

Concretely, a Chargebacks tool would add `src/apps/chargebacks/` with:

1. `app.ts` — a `LedgerApp` manifest: nav items, the permissions it defines and the
   roles that receive them, and `install` pointing at its own `data/schema.ts`.
2. `domain/` — its statuses and rules, pure and unit-tested.
3. `data/` — its tables, plus queries built on `defineQuery`.
4. `service/` — reads that `requirePermission`, writes wrapped in `defineAction`.
5. `ui/` — column and filter configuration plus its screens, built from the UI kit.
6. A thin route under `src/app/` that resolves the actor and renders the screen.

The only platform-side change is adding the manifest to `INSTALLED_APPS` in
`src/platform/apps.ts`. Navigation, the permission matrix, audit coverage and schema
installation all follow from the manifest — nothing in `src/ledger` is edited.

### Data model

`Customer → Transaction → Refund`, plus `AuditEvent` (polymorphic on
`entityType`/`entityId`) and `User` (id, name, email, role). Money is stored in integer
minor units. The seed is deterministic: 48 customers, 180 transactions, 102 refunds
across all four statuses, ~170 audit events, including partial refunds, over-refunds,
high-value requests and one denied approval attempt so the audit log shows enforcement.

## How to run it

```bash
npm install
npm run seed        # deterministic synthetic data into data/ledger.db
npm run dev         # http://localhost:3000  → redirects to /refunds
```

```bash
npm test            # rule + authorization unit tests (vitest)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
npm run seed -- --force   # rebuild the dataset
```

`LEDGER_DB_PATH` overrides the SQLite location.

## What would be built next in a production implementation

1. **Real identity**: replace `ledger/auth/session.ts` with OIDC/SSO + short-lived
   sessions, group-derived roles, and step-up auth for high-value approvals. The
   `Actor` shape and every permission check stay as they are.
2. **Real persistence**: Postgres with migrations behind the same repository/`defineQuery`
   surface, plus optimistic concurrency on decisions (the `expectedStatus` field is
   already accepted) so two reviewers can't race a transition.
3. **Payments integration**: an idempotent refund-execution port to the processor, with
   outbox + retry, and a `SETTLING`/`FAILED` extension to the status model so the UI
   distinguishes "approved" from "money moved".
4. **Segregation of duties and policy as data**: approval thresholds, SLA windows and
   note requirements as configuration per business unit rather than constants, plus
   maker/checker (the requester can never be the approver).
5. **Audit hardening**: hash-chained or WORM-stored events, retention policy, and export
   for SOC 2 / PCI evidence; audit reads move to a read replica.
6. **Operational quality**: authorization tests as a required CI gate, Playwright
   coverage of the golden path, structured logging/tracing per action name, queue
   assignment + SLA alerting, and pagination via keyset for large queues.
7. **Platform packaging**: publish `src/ledger` as an internal package with a generator
   (`create-ledger-app`) and Storybook for the UI kit, so the tenth tool is scaffolded
   rather than written.
