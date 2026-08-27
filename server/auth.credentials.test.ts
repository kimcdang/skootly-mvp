import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, resetCredentialAttemptsForTests } from "./passwordAuth";

const mocks = vi.hoisted(() => ({
  createCredentialUser: vi.fn(),
  getCredentialByEmail: vi.fn(),
  getCredentialForUser: vi.fn(),
  setUserPasswordCredential: vi.fn(),
  touchUserSignIn: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  createCredentialUser: mocks.createCredentialUser,
  getCredentialByEmail: mocks.getCredentialByEmail,
  getCredentialForUser: mocks.getCredentialForUser,
  setUserPasswordCredential: mocks.setUserPasswordCredential,
  touchUserSignIn: mocks.touchUserSignIn,
}));

vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken: mocks.createSessionToken } }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };
const sampleUser = { id: 9, openId: "local_1234567890abcdef1234567890abcdef", name: "Kim", email: "kim@example.com", loginMethod: "password", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function context(user: TrpcContext["user"] = null) {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", ip: "203.0.113.10", headers: {} } as TrpcContext["req"],
    res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("Skootly credential auth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCredentialAttemptsForTests();
    mocks.createSessionToken.mockResolvedValue("signed-session-token");
    mocks.createCredentialUser.mockResolvedValue(sampleUser);
    mocks.getCredentialByEmail.mockResolvedValue(null);
    mocks.getCredentialForUser.mockResolvedValue(null);
    mocks.setUserPasswordCredential.mockResolvedValue({ success: true });
  });

  it("registers a normalized email with a non-plaintext hash and issues the secure session cookie", async () => {
    const { ctx, cookies } = context();
    await appRouter.createCaller(ctx).auth.register({ name: "Kim", email: " KIM@Example.com ", password: "progress-not-noise-2026" });
    expect(mocks.createCredentialUser).toHaveBeenCalledWith(expect.objectContaining({ name: "Kim", email: "kim@example.com", openId: expect.stringMatching(/^local_/) }));
    const stored = mocks.createCredentialUser.mock.calls[0][0].passwordHash as string;
    expect(stored).not.toContain("progress-not-noise-2026");
    expect(cookies[0]).toMatchObject({ name: "app_session_id", value: "signed-session-token", options: { httpOnly: true, secure: true, sameSite: "none", path: "/" } });
  });

  it("returns a clear conflict without issuing a session for an existing email", async () => {
    mocks.createCredentialUser.mockRejectedValue(new Error("EMAIL_IN_USE"));
    const { ctx, cookies } = context();
    await expect(appRouter.createCaller(ctx).auth.register({ name: "Kim", email: "kim@example.com", password: "progress-not-noise-2026" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(cookies).toHaveLength(0);
  });

  it("uses a generic invalid-credential error and never issues a cookie", async () => {
    const { ctx, cookies } = context();
    await expect(appRouter.createCaller(ctx).auth.login({ email: "missing@example.com", password: "wrong" })).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "The email or password is incorrect." });
    expect(cookies).toHaveLength(0);
  });

  it("verifies a valid password, touches only that user, and issues a session", async () => {
    const passwordHash = await hashPassword("progress-not-noise-2026");
    mocks.getCredentialByEmail.mockResolvedValue({ user: sampleUser, credential: { id: 2, userId: sampleUser.id, email: sampleUser.email, passwordHash, createdAt: new Date(), updatedAt: new Date() } });
    const { ctx, cookies } = context();
    await appRouter.createCaller(ctx).auth.login({ email: "KIM@example.com", password: "progress-not-noise-2026" });
    expect(mocks.getCredentialByEmail).toHaveBeenCalledWith("kim@example.com");
    expect(mocks.touchUserSignIn).toHaveBeenCalledWith(sampleUser.id);
    expect(mocks.createSessionToken).toHaveBeenCalledWith(sampleUser.openId, expect.objectContaining({ name: "Kim" }));
    expect(cookies).toHaveLength(1);
  });

  it("lets an authenticated legacy user attach a password only to their own user and email", async () => {
    const legacyUser = { ...sampleUser, id: 44, openId: "manus-user", loginMethod: "manus" };
    const { ctx } = context(legacyUser);
    await appRouter.createCaller(ctx).auth.setPassword({ password: "a-new-secure-password-2026" });
    expect(mocks.setUserPasswordCredential).toHaveBeenCalledWith(44, "kim@example.com", expect.stringMatching(/^scrypt\$/));
  });
});
