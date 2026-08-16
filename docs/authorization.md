# Authorization in The Ledger

Authorization here is a property of the **service layer**, not of the UI. Hidden
buttons and 403 screens are only a courtesy: the same answer is produced when the
service is called from a script, a replayed Server Action or a hand-written HTTP
request.

## The model

| Concept | Where | What it is |
| --- | --- | --- |
| `Role` | `src/ledger/auth/roles.ts` | `REVIEWER` or `ADMIN` — platform-wide, deliberately few. |
| `Permission` | `src/ledger/auth/access.ts` | A `"domain:verb"` string *declared by an application*, together with the roles that receive it. |
| `AccessPolicy` | `src/ledger/auth/access.ts` | The permission set built from the installed app manifests; rejects duplicate declarations. |
| `Actor` | `src/ledger/auth/actor.ts` | The signed-in user plus the permissions its role is granted. `can()` / `requirePermission()` read only this list. |

Permissions live with the application that owns them, so the platform never
enumerates domain capabilities:

| Permission | Declared by | Reviewer | Admin |
| --- | --- | --- | --- |
| `refunds:view` | `src/apps/refunds/app.ts` | ✅ | ✅ |
| `refunds:decide` | `src/apps/refunds/app.ts` | ✅ | ✅ |
| `refunds:decide_high_value` | `src/apps/refunds/app.ts` | — | ✅ |
| `audit:view` | `src/ledger/admin/adminApp.ts` | — | ✅ |
| `admin:access` | `src/ledger/admin/adminApp.ts` | — | ✅ |

Admin is a strict superset of Reviewer, so an admin works the refund queue with
the same code path a reviewer uses.

Checks are always against a **permission**, never a role, and never against
anything the client sent. `getActor()` / `requireActor()`
(`src/platform/access.ts`) re-resolve the actor from the server-side session on
every request and expand it through the access policy, so the permission list is
derived server-side from the stored role — a cookie cannot carry one.

## Where it is enforced

### Mutations: `defineAction`

Every business mutation is wrapped by `defineAction`
(`src/ledger/action/defineAction.ts`), which runs, in order:

1. zod validation of untrusted input,
2. `requirePermission(actor, definition.permission)`,
3. `definition.additionalPermissions(input, context)` — permissions that depend on
   the *entity*, resolved from the database,
4. the domain rules,
5. an audit event, including for `DENIED` and `REJECTED_BY_RULE` outcomes.

Steps 2–3 happen before the handler runs, so a denied call cannot touch a row. A
denial is recorded with the permission that was actually missing:

```ts
audit(definition, { input, output: null, context }, "DENIED", {
  reason: error.message,
  requiredPermission: error.permission,
});
return { ok: false, error: { code: "FORBIDDEN", message: error.message } };
```

The entity-dependent step is what makes "a reviewer may not approve $900" an
authorization decision rather than a UI rule
(`src/apps/refunds/service/refundDecisions.ts`):

```ts
additionalPermissions: (input) =>
  permissionsForDecision(loadRefund(input.refundId), decision).filter(
    (required) => required !== permission,
  ),
```

`loadRefund` reads the persisted refund, so the amount that decides whether
`refunds:decide_high_value` is required comes from the database. A payload that
claims `requestedAmountCents: 1` or `actorRole: "ADMIN"` changes nothing: those
fields are not in the schema, and the actor comes from the session.

### Reads: gated services

Reads are gated in the service that performs them, not in the screen that renders
them:

| Service | Requires |
| --- | --- |
| `listRefundQueue` / `getRefundDetail` (`src/apps/refunds/service/refundQueries.ts`) | `refunds:view` |
| `listAuditEvents` (`src/ledger/audit/auditService.ts`) | `audit:view` |
| `getAccessOverview` (`src/ledger/auth/accessService.ts`) | `admin:access` |

The admin screens call these services and merely translate a `ForbiddenError`
into the shared `Forbidden` view. Deleting that translation would turn the page
into an error, not into a leak.

### The UI is an explanation, not a gate

`checkDecision` (`src/apps/refunds/domain/rules.ts`) is pure and shared: the
decision panel uses it to disable a button and *say why*, and the service uses
`permissionsForDecision` from the same module to enforce. The sidebar filters nav
items by permission for the same reason — so nobody is shown a door they cannot
open.

## Demonstrating the two roles locally

```bash
npm run seed        # prints the demo password
npm run dev         # http://localhost:3000
```

Sign in as `priya.raman@ledger.dev` (Reviewer) or `sam.ortega@ledger.dev`
(Admin); the password is printed by the seed (`ledger-demo` unless
`LEDGER_DEMO_PASSWORD` is set). Switching role means signing in as the other
account — identity comes from a real session, so there is no role switcher that
could be mistaken for an authorization mechanism.

As a Reviewer: a high-value refund shows *Approve* disabled with the policy
reason, *Escalate* works, and `/admin/audit` or `/admin/access` render a
server-side 403 when typed into the address bar. As an Admin: the same refund
approves, and the Platform nav section appears.

## Verifying that the UI is not the boundary

```bash
npm run authz:check   # calls the services directly as each role
npm test              # includes the bypass tests below
```

`scripts/authz-check.ts` builds a throwaway database and calls the service layer
with no browser involved:

- reviewer approving a standard refund — allowed;
- reviewer approving a high-value refund — `FORBIDDEN`, row untouched;
- a crafted payload claiming a small amount and an admin role — still `FORBIDDEN`;
- reviewer escalating, then admin approving the escalated refund — allowed;
- re-deciding a terminal refund — `RULE_VIOLATION`;
- reviewer reading the audit log / access control — `FORBIDDEN`; admin — allowed;
- both denials present in the audit log with
  `requiredPermission: "refunds:decide_high_value"`.

The same guarantees are asserted as tests in
`src/apps/refunds/service/refundAuthorization.test.ts` and
`src/ledger/admin/adminReads.test.ts`. Replaying the raw Server Action POST with a
reviewer's session cookie yields the same `FORBIDDEN`, because the action resolves
the actor from the session and delegates to the same service.

## What production would need

The `Actor` shape and every `requirePermission` call are the stable part; what
changes is how an actor is produced and how policy is stored.

1. **Identity from an IdP.** Replace the password/session store with OIDC/SSO:
   validate the provider's tokens, map IdP groups to Ledger roles at sign-in, and
   keep the same server-side session for the request path. `toActor()` becomes the
   only seam that changes.
2. **Step-up authentication.** High-value approval is the natural place to require
   re-authentication or MFA; because it is already its own permission checked
   inside `defineAction`, the step-up assertion can be added as another
   `additionalPermissions`-style requirement rather than a new code path.
3. **Policy as data.** Grants live in code today (`grantedTo` in each manifest).
   In production they belong in a table or an external policy service, with
   versioning and an approval workflow for changes — `buildAccessPolicy` already
   isolates that lookup.
4. **Finer scoping.** Real deployments need row-level scoping (business unit,
   region, queue assignment) and segregation of duties: maker/checker so the
   requester can never be the approver. Both extend the permission check into a
   `(permission, resource)` check inside the same wrapper.
5. **Provisioning and review.** SCIM provisioning/deprovisioning, periodic access
   reviews, and break-glass accounts with time-boxed elevation — all audited.
6. **Audit hardening.** Hash-chained or WORM-stored events with retention and
   export, so the `DENIED` record of a bypass attempt is evidence rather than a
   log line.
7. **CI enforcement.** The authorization tests and `authz:check` become a required
   gate, plus a test that fails if any `defineAction` is declared without a
   permission or any exported read service lacks a `requirePermission`.
