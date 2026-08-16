import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/**
 * Ledger platform: password hashing.
 *
 * scrypt with a per-password salt, stored as `scrypt$N$r$p$salt$hash`. Verify is
 * constant-time. Nothing outside this module handles raw passwords.
 */

const KEY_LENGTH = 64;
const PARAMS = { N: 16_384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { ...PARAMS });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  let derived: Buffer;
  try {
    derived = scryptSync(password, Buffer.from(salt, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
