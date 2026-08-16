import { Row, requireString, selectAll, selectOne } from "../data/repository";
import type { AccessPolicy } from "./access";
import type { Actor } from "./actor";
import type { Role } from "./roles";

/** The stored user. It has a role; it does not know what that role may do. */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const mapUser = (row: Row): UserRecord => ({
  id: requireString(row, "id"),
  name: requireString(row, "name"),
  email: requireString(row, "email"),
  role: requireString(row, "role") as Role,
});

export function listUsers(): UserRecord[] {
  return selectAll("SELECT * FROM users ORDER BY role, name", [], mapUser);
}

export function findUser(id: string): UserRecord | null {
  return selectOne("SELECT * FROM users WHERE id = ?", [id], mapUser);
}

/** Expands a stored user into an Actor by resolving its permissions. */
export function toActor(user: UserRecord, policy: AccessPolicy): Actor {
  return { ...user, permissions: policy.permissionsFor(user.role) };
}
