import { forbidden403 } from "../forbidden";
import { can } from "@/ledger/auth/actor";
import { requireActor } from "@/ledger/auth/session";
import { listUsers } from "@/ledger/auth/users";
import {
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
  roleHasPermission,
} from "@/ledger/auth/roles";
import { Card, PageHeader } from "@/ledger/ui/primitives";

export default async function AccessControlPage() {
  const actor = await requireActor("/admin/access");
  if (!can(actor, "admin:access")) {
    return forbidden403("admin:access", actor.role);
  }

  const users = listUsers();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Platform · Admin"
        title="Access control"
        description="Roles are bundles of permissions. Business actions check permissions, never roles or UI state."
      />

      <Card dense title="Permission matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
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
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <td className="px-3 py-2 font-mono text-[12px]">{permission}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-3 py-2">
                      {roleHasPermission(role, permission) ? (
                        <span className="text-emerald-700">granted</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
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
