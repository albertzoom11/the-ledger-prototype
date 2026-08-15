import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Ledger platform: single database handle plus schema migration.
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

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      risk_tier TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      descriptor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id),
      requested_amount_cents INTEGER NOT NULL,
      reason TEXT NOT NULL,
      requester_note TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT REFERENCES users(id),
      decision_note TEXT
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

    CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
    CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refunds(requested_at);
    CREATE INDEX IF NOT EXISTS idx_txn_customer ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(timestamp);
  `);
}

export function databaseIsSeeded(): boolean {
  const row = getDb()
    .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM refunds")
    .get();
  return (row?.count ?? 0) > 0;
}
