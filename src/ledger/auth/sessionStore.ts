import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  Row,
  execute,
  requireNumber,
  requireString,
  optionalString,
  selectOne,
} from "../data/repository";
import type { Actor } from "./actor";
import type { Role } from "./roles";
import { verifyPassword } from "./password";

/**
 * Ledger platform: server-side sessions.
 *
 * The browser only ever holds an opaque random token; the database stores its
 * SHA-256 hash, the owning user and an expiry. Revoking a session is a DELETE,
 * and a stolen cookie cannot be turned back into a password.
 */

export const SESSION_COOKIE = "ledger_session";
export const SESSION_TTL_HOURS = 12;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const mapActor = (row: Row): Actor => ({
  id: requireString(row, "id"),
  name: requireString(row, "name"),
  email: requireString(row, "email"),
  role: requireString(row, "role") as Role,
});

export interface IssuedSession {
  token: string;
  expiresAt: string;
}

export type SignInResult =
  | { ok: true; actor: Actor; session: IssuedSession }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "LOCKED"; retryAt?: string };

interface CredentialRow extends Row {
  id: string;
  name: string;
  email: string;
  role: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: string | null;
}

/**
 * Verifies an email/password pair and, on success, issues a session.
 *
 * Failures are counted per user and trip a short lockout, so the login form is
 * not an unlimited password oracle. The same generic result is returned for an
 * unknown email and a wrong password so the form cannot enumerate accounts.
 */
export function signInWithPassword(
  email: string,
  password: string,
  now: Date = new Date(),
): SignInResult {
  const row = selectOne<CredentialRow>(
    "SELECT * FROM users WHERE lower(email) = lower(?)",
    [email.trim()],
    (raw) => ({
      ...mapActor(raw),
      password_hash: requireString(raw, "password_hash"),
      failed_attempts: requireNumber(raw, "failed_attempts"),
      locked_until: optionalString(raw, "locked_until"),
      role: requireString(raw, "role"),
    }) as CredentialRow,
  );

  if (!row || !row.password_hash) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (row.locked_until && new Date(row.locked_until) > now) {
    return { ok: false, reason: "LOCKED", retryAt: row.locked_until };
  }

  if (!verifyPassword(password, row.password_hash)) {
    const attempts = row.failed_attempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;
    execute(
      "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
      [attempts, lockedUntil, row.id],
    );
    return lockedUntil
      ? { ok: false, reason: "LOCKED", retryAt: lockedUntil }
      : { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  execute(
    "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
    [row.id],
  );

  return {
    ok: true,
    actor: { id: row.id, name: row.name, email: row.email, role: row.role as Role },
    session: createSession(row.id, now),
  };
}

export function createSession(
  userId: string,
  now: Date = new Date(),
  userAgent: string | null = null,
): IssuedSession {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + SESSION_TTL_HOURS * 3_600_000,
  ).toISOString();
  execute(
    `INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at, last_seen_at, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `ses_${randomUUID()}`,
      hashToken(token),
      userId,
      now.toISOString(),
      expiresAt,
      now.toISOString(),
      userAgent,
    ],
  );
  return { token, expiresAt };
}

/** Resolves a session token to its actor, expiring stale sessions as it goes. */
export function actorForSessionToken(
  token: string,
  now: Date = new Date(),
): Actor | null {
  const tokenHash = hashToken(token);
  const row = selectOne<{ actor: Actor; expiresAt: string }>(
    `SELECT u.id, u.name, u.email, u.role, s.expires_at AS expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
    [tokenHash],
    (raw) => ({ actor: mapActor(raw), expiresAt: requireString(raw, "expires_at") }),
  );
  if (!row) return null;

  if (new Date(row.expiresAt) <= now) {
    execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
    return null;
  }

  execute("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?", [
    now.toISOString(),
    tokenHash,
  ]);
  return row.actor;
}

export function revokeSession(token: string): void {
  execute("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
}

export function pruneExpiredSessions(now: Date = new Date()): void {
  execute("DELETE FROM sessions WHERE expires_at <= ?", [now.toISOString()]);
}
