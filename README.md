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
  ledger/                     platform primitives — app-agnostic
    auth/       roles + permissions, Actor, requirePermission(), cookie session
    action/     defineAction(): validate → authorize → run rules → audit
    audit/      append-only audit log + AuditTimeline
    data/       db + schema, defineQuery/buildWhere (filter, sort, paginate)
    shell/      AppShell, permission-filtered nav, app registry, identity switcher
    ui/         DataTable, Pagination, FilterBar, StatusBadge, ConfirmDialog,
                Card/PageHeader/DescriptionList, form fields, Empty/Error/Skeleton,
                money & date formatting
  apps/
    refunds/                  the first application
      domain/     status model, transitions, rules, risk signals (pure, tested)
      data/       refund queries built on the ledger data primitives
      service/    read + write use cases; server actions are a thin transport
      ui/         table/filter *configuration* + decision panel
  app/                        routes: /refunds, /refunds/[id], /admin/audit, /admin/access
scripts/seed.ts               deterministic synthetic dataset
```

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

Adding a second internal tool (say Chargebacks) means: a domain file, a data file built
on `defineQuery`, a service file of `defineAction`s, a column/filter config, a route, and
one entry in `LEDGER_APPS`. No platform changes.

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
