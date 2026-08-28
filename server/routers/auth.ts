import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createCredentialUser, getCredentialByEmail, getCredentialForUser, listMyMcpConnections, revokeMyMcpConnection, setUserPasswordCredential, touchUserSignIn } from "../db";
import { assertCredentialAttemptAllowed, createLocalOpenId, hashPassword, normalizeEmail, recordCredentialAttempt, verifyPassword } from "../passwordAuth";

const emailSchema = z.string().trim().email().max(320).transform(normalizeEmail);
const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128, "Use no more than 128 characters.");

function attemptKey(ip: string | undefined, email: string) {
  return createHash("sha256").update(`${ip || "unknown"}|${email}`).digest("hex");
}

async function issueSession(ctx: { req: any; res: any }, user: { openId: string; name: string | null; email: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { expiresInMs: ONE_YEAR_MS, name: user.name || user.email || "Skootly user" });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  credentialStatus: protectedProcedure.query(async ({ ctx }) => ({ hasPassword: Boolean(await getCredentialForUser(ctx.user.id)), email: ctx.user.email })),
  mcpConnections: protectedProcedure.query(({ ctx }) => listMyMcpConnections(ctx.user.id)),
  revokeMcpConnection: protectedProcedure.input(z.object({ tokenId: z.number().int().positive() })).mutation(({ ctx, input }) => revokeMyMcpConnection(ctx.user.id, input.tokenId)),
  register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, password: passwordSchema })).mutation(async ({ ctx, input }) => {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await createCredentialUser({ openId: createLocalOpenId(), name: input.name, email: input.email, passwordHash });
      await issueSession(ctx, user);
      return { success: true } as const;
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_IN_USE") throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email. Sign in, or use the legacy Manus option once to add a password." });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not create the account. Please try again." });
    }
  }),
  login: publicProcedure.input(z.object({ email: emailSchema, password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const key = attemptKey(ctx.req.ip, input.email);
    try { assertCredentialAttemptAllowed(key); } catch { throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait 15 minutes and try again." }); }
    const account = await getCredentialByEmail(input.email);
    const valid = await verifyPassword(input.password, account?.credential.passwordHash);
    recordCredentialAttempt(key, valid);
    if (!account || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "The email or password is incorrect." });
    await touchUserSignIn(account.user.id);
    await issueSession(ctx, account.user);
    return { success: true } as const;
  }),
  setPassword: protectedProcedure.input(z.object({ password: passwordSchema, currentPassword: z.string().max(128).optional() })).mutation(async ({ ctx, input }) => {
    const email = ctx.user.email ? normalizeEmail(ctx.user.email) : null;
    if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "This account needs an email before a password can be added." });
    const existing = await getCredentialForUser(ctx.user.id);
    if (existing && !(await verifyPassword(input.currentPassword || "", existing.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Enter your current password before choosing a new one." });
    try {
      await setUserPasswordCredential(ctx.user.id, email, await hashPassword(input.password));
      return { success: true } as const;
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_IN_USE") throw new TRPCError({ code: "CONFLICT", message: "This email is already attached to another Skootly account." });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not update the password. Please try again." });
    }
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
