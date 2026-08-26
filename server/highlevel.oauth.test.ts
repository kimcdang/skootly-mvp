import { describe, expect, it, vi } from "vitest";
import {
  decryptHighLevelToken,
  encryptHighLevelToken,
  hashOAuthState,
} from "./highlevelCrypto";
import {
  assertHighLevelConnectionOwnership,
  buildHighLevelRefreshBody,
  isHighLevelOAuthStateUsable,
  uninstallHighLevelApplication,
} from "./highlevelOAuth";

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

  it("rejects used, expired, and cross-user OAuth state records", () => {
    const now = 1_777_000_000_000;
    expect(isHighLevelOAuthStateUsable({ userId: 7, expiresAt: now + 1, usedAt: null }, 7, now)).toBe(true);
    expect(isHighLevelOAuthStateUsable({ userId: 7, expiresAt: now - 1, usedAt: null }, 7, now)).toBe(false);
    expect(isHighLevelOAuthStateUsable({ userId: 7, expiresAt: now + 1, usedAt: now }, 7, now)).toBe(false);
    expect(isHighLevelOAuthStateUsable({ userId: 7, expiresAt: now + 1, usedAt: null }, 8, now)).toBe(false);
  });

  it("builds refresh requests from the current rotating refresh token only", () => {
    const body = buildHighLevelRefreshBody({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "latest-rotated-refresh-token",
      userType: "Location",
      redirectUri: "https://skootly.com/api/integrations/highlevel/callback",
    });
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("latest-rotated-refresh-token");
    expect(body.get("user_type")).toBe("Location");
    expect(body.has("access_token")).toBe(false);
  });

  it("rejects cross-user connection ownership before select, refresh, or disconnect work", () => {
    expect(() => assertHighLevelConnectionOwnership({ id: 12, userId: 7 }, 8, 12)).toThrow("not found");
    expect(() => assertHighLevelConnectionOwnership({ id: 12, userId: 7 }, 7, 13)).toThrow("not found");
    expect(assertHighLevelConnectionOwnership({ id: 12, userId: 7 }, 7, 12)).toEqual({ id: 12, userId: 7 });
  });

  it("remotely uninstalls one location without exposing its access token in errors", async () => {
    const accessToken = "sensitive-access-token";
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toContain('"locationId":"location-1"');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as unknown as typeof fetch;
    await uninstallHighLevelApplication({ appId: "app-1", locationId: "location-1", accessToken }, fetchImpl);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/marketplace/app/app-1/installations");

    const failingFetch = vi.fn(async () => new Response("denied", { status: 403 })) as unknown as typeof fetch;
    const error = await uninstallHighLevelApplication({ appId: "app-1", locationId: "location-1", accessToken }, failingFetch).catch(value => value as Error);
    expect(error.message).not.toContain(accessToken);
  });
});
