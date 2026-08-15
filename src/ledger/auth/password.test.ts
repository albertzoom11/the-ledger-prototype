import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("never stores the plaintext and salts each hash", () => {
    const first = hashPassword("correct horse battery");
    const second = hashPassword("correct horse battery");

    expect(first).not.toContain("correct horse battery");
    expect(first).not.toEqual(second);
    expect(first.startsWith("scrypt$")).toBe(true);
  });

  it("accepts the right password and rejects everything else", () => {
    const stored = hashPassword("ledger-demo");

    expect(verifyPassword("ledger-demo", stored)).toBe(true);
    expect(verifyPassword("ledger-Demo", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("rejects malformed or legacy hash values instead of throwing", () => {
    expect(verifyPassword("ledger-demo", "")).toBe(false);
    expect(verifyPassword("ledger-demo", "plaintext")).toBe(false);
    expect(verifyPassword("ledger-demo", "scrypt$a$b$c$d$e")).toBe(false);
  });
});
