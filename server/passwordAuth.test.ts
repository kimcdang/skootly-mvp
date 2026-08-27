import { beforeEach, describe, expect, it } from "vitest";
import { assertCredentialAttemptAllowed, createLocalOpenId, hashPassword, normalizeEmail, recordCredentialAttempt, resetCredentialAttemptsForTests, verifyPassword } from "./passwordAuth";

describe("password authentication primitives", () => {
  beforeEach(() => resetCredentialAttemptsForTests());

  it("normalizes email and creates non-Manus local identities", () => {
    expect(normalizeEmail("  Kim@Example.COM ")).toBe("kim@example.com");
    expect(createLocalOpenId()).toMatch(/^local_[a-f0-9]{32}$/);
  });

  it("stores a salted one-way scrypt hash and verifies only the correct password", async () => {
    const password = "progress-not-noise-2026";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
  });

  it("blocks a repeated credential-attempt key after eight failures and clears it after success", () => {
    for (let index = 0; index < 7; index += 1) recordCredentialAttempt("ip-email", false, 1_000 + index);
    expect(() => assertCredentialAttemptAllowed("ip-email", 1_008)).not.toThrow();
    recordCredentialAttempt("ip-email", false, 1_008);
    expect(() => assertCredentialAttemptAllowed("ip-email", 1_009)).toThrow("RATE_LIMITED");
    recordCredentialAttempt("ip-email", true, 1_010);
    expect(() => assertCredentialAttemptAllowed("ip-email", 1_011)).not.toThrow();
  });
});
