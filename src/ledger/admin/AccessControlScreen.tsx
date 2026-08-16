import { Fragment } from "react";
import type { AccessPolicy } from "../auth/access";
import { getAccessOverview } from "../auth/accessService";
import type { Actor } from "../auth/actor";
import { ForbiddenError } from "../auth/actor";
import { ROLES, ROLE_LABELS } from "../auth/roles";
import { Forbidden } from "../ui/Forbidden";
import { Card, PageHeader } from "../ui/primitives";

/**
 * Platform screen: the permission matrix, rendered straight from the access
 * policy. Because each application declares its own permissions, this page
 * documents whatever is installed without being edited.
 */
export function AccessControlScreen({
  actor,
  policy,
}: {
  actor: Actor;
  policy: AccessPolicy;
}) {
  // The service is the enforcement point; the screen only renders the denial.
  let overview;
  try {
    overview = getAccessOverview(actor, policy);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <Forbidden permission={error.permission} role={actor.role} />;
    }
    throw error;
  }
  const { users, groups } = overview;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Platform · Admin"
        title="Access control"
        description="Roles are bundles of permissions. Business actions check permissions, never roles or UI state."
      />

      <Card dense title="Permission matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line bg-canvas">
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <tr className="bg-canvas">
                    <td
                      colSpan={ROLES.length + 1}
                      className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted"
                    >
                      {group.name}
                    </td>
                  </tr>
                  {group.permissions.map((definition) => (
                    <tr key={definition.key}>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[12px]">{definition.key}</div>
                        <div className="text-[12px] text-muted">
                          {definition.description}
                        </div>
                      </td>
                      {ROLES.map((role) => (
                        <td key={role} className="px-3 py-2">
                          {definition.grantedTo.includes(role) ? (
                            <span className="text-emerald-700">granted</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card dense title="Directory">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-canvas">
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Name
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Email
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-2">{user.name}</td>
                <td className="px-3 py-2 text-muted">{user.email}</td>
                <td className="px-3 py-2">{ROLE_LABELS[user.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
