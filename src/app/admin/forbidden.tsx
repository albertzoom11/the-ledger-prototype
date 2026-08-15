import type { Permission, Role } from "@/ledger/auth/roles";
import { ROLE_LABELS } from "@/ledger/auth/roles";
import { ButtonLink, ErrorState } from "@/ledger/ui/primitives";

/**
 * Shared 403 view. Admin routes render this from a server-side permission check,
 * so navigating directly to the URL as a Reviewer is refused by the server.
 */
export function forbidden403(permission: Permission, role: Role) {
  return (
    <div className="max-w-xl">
      <ErrorState
        title="403 — Not authorized"
        description={`This page requires the "${permission}" permission. You are signed in as ${ROLE_LABELS[role]}. Switch to an Admin using the identity switcher to continue.`}
        retry={
          <div className="mt-2">
            <ButtonLink href="/refunds" variant="secondary" size="sm">
              Back to refund queue
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
