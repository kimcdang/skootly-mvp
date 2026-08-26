import { describe, expect, it } from "vitest";
import {
  decryptHighLevelToken,
  encryptHighLevelToken,
  hashOAuthState,
} from "./highlevelCrypto";

describe("HighLevel OAuth security primitives", () => {
  const secret = "test-only-encryption-secret";

  it("encrypts tokens with authenticated user/location context", () => {
    const encrypted = encryptHighLevelToken("access-token-value", "user:7:location:abc", secret);
    expect(encrypted).not.toContain("access-token-value");
    expect(decryptHighLevelToken(encrypted, "user:7:location:abc", secret)).toBe(
      "access-token-value",
    );
  });

  it("rejects decryption under a different user or location context", () => {
    const encrypted = encryptHighLevelToken("refresh-token", "user:7:location:abc", secret);
    expect(() => decryptHighLevelToken(encrypted, "user:8:location:abc", secret)).toThrow();
    expect(() => decryptHighLevelToken(encrypted, "user:7:location:def", secret)).toThrow();
  });

  it("hashes OAuth state into a non-reversible fixed-length value", () => {
    const hash = hashOAuthState("single-use-random-state");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashOAuthState("single-use-random-state"));
    expect(hash).not.toContain("single-use-random-state");
  });
});
