import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { fetchHighLevelSnapshot, getHighLevelStatus } from "../highlevel";
import {
  createHighLevelOAuthStart,
  disconnectHighLevelConnection,
  getHighLevelAccessForUser,
  getHighLevelOAuthConfigStatus,
  listHighLevelConnections,
  markHighLevelSync,
  selectHighLevelConnection,
} from "../highlevelOAuth";

export const highLevelRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const connections = await listHighLevelConnections(ctx.user.id);
    const oauth = getHighLevelOAuthConfigStatus();
    const founderTest = ctx.user.role === "admin" ? getHighLevelStatus() : null;
    return {
      oauthConfigured: oauth.configured,
      founderTestConfigured: Boolean(founderTest?.configured),
      configured: connections.length > 0 || Boolean(founderTest?.configured),
      mode: connections.length > 0 ? ("oauth" as const) : founderTest?.configured ? ("founder_test" as const) : ("none" as const),
      connections,
    };
  }),
  start: protectedProcedure
    .input(z.object({ returnPath: z.string().max(240).default("/founder") }))
    .mutation(({ ctx, input }) => createHighLevelOAuthStart(ctx.user.id, input.returnPath)),
  select: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await selectHighLevelConnection(ctx.user.id, input.connectionId);
      return { success: true };
    }),
  disconnect: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await disconnectHighLevelConnection(ctx.user.id, input.connectionId);
      return { success: true };
    }),
  snapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const access = await getHighLevelAccessForUser(ctx.user.id);
    if (!access) {
      if (ctx.user.role !== "admin" || !getHighLevelStatus().configured) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect your GoHighLevel account first." });
      }
      return fetchHighLevelSnapshot();
    }
    try {
      const snapshot = await fetchHighLevelSnapshot({
        token: access.accessToken,
        locationId: access.connection.locationId,
      });
      await markHighLevelSync(ctx.user.id, access.connection.id);
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : "GoHighLevel sync failed.";
      await markHighLevelSync(ctx.user.id, access.connection.id, message);
      throw new TRPCError({ code: "BAD_GATEWAY", message });
    }
  }),
});
