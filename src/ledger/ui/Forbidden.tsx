import type { Permission } from "../auth/access";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { ButtonLink, ErrorState } from "./primitives";

/**
 * Ledger platform UI kit: the shared 403 view. Pages render this from a
 * server-side permission check, so navigating directly to the URL without the
 * permission is refused by the server rather than hidden by the UI.
 */
export function Forbidden({
  permission,
  role,
  backHref = "/",
  backLabel = "Back to home",
}: {
  permission: Permission;
  role: Role;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="max-w-xl">
      <ErrorState
        title="403 — Not authorized"
        description={`This page requires the "${permission}" permission. You are signed in as ${ROLE_LABELS[role]}. Sign in with an Admin account to continue.`}
        retry={
          <div className="mt-2">
            <ButtonLink href={backHref} variant="secondary" size="sm">
              {backLabel}
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
