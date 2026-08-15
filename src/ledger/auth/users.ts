import { Row, requireString, selectAll, selectOne } from "../data/repository";
import type { Actor } from "./actor";
import type { Role } from "./roles";

const mapUser = (row: Row): Actor => ({
  id: requireString(row, "id"),
  name: requireString(row, "name"),
  email: requireString(row, "email"),
  role: requireString(row, "role") as Role,
});

export function listUsers(): Actor[] {
  return selectAll("SELECT * FROM users ORDER BY role, name", [], mapUser);
}

export function findUser(id: string): Actor | null {
  return selectOne("SELECT * FROM users WHERE id = ?", [id], mapUser);
}
