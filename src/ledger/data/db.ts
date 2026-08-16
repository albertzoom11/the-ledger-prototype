import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Ledger platform: single database handle plus the platform's own schema.
 *
 * The platform owns identity and the audit log. Application tables are owned by
 * the application (see `applySchema` and, for example,
 * `src/apps/refunds/data/schema.ts`), so the platform never has to be edited to
 * install a new internal tool.
 *
 * Applications never import better-sqlite3 directly; they go through the
 * repository helpers in ./repository, so the storage engine stays swappable.
 */

const DB_PATH =
  process.env.LEDGER_DB_PATH ?? path.join(process.cwd(), "data", "ledger.db");

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  instance = db;
  return db;
}

/** The platform schema: identity and the append-only audit log. */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      outcome TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(timestamp);
  `);
}

/**
 * How an application installs its own tables. Statements must be idempotent
 * (`CREATE TABLE IF NOT EXISTS`); the platform tables always exist first, so an
 * application may reference `users`.
 */
export function applySchema(sql: string, db: Database.Database = getDb()): void {
  db.exec(sql);
}

/** True once identity exists, i.e. `npm run seed` has been run. */
export function databaseIsSeeded(): boolean {
  const row = getDb()
    .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM users")
    .get();
  return (row?.count ?? 0) > 0;
}
