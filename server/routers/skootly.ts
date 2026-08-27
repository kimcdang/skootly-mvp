import { z } from "zod";
import {
  dailyCheckinInputSchema,
  experimentEventInputSchema,
  experimentVersionSchema,
  skootOutcomeInputSchema,
} from "../../shared/skootly";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createCheckin,
  getHistory,
  getWorkspace,
  markCheckinNeedsClarification,
  saveOutcome,
  saveRecommendation,
  saveRecommendationLearningSources,
  trackEvent,
  updateSkootStatus,
  getEnabledLearningContextWithSources,
  getAssignedCreatorPackContext,
  saveCreatorPackRecommendationAttribution,
} from "../db";
import { generateRecommendation } from "../skootlyEngine";
import { fetchHighLevelSnapshot, getHighLevelStatus } from "../highlevel";
import {
  getHighLevelAccessForUser,
  markHighLevelSync,
} from "../highlevelOAuth";

export const skootlyRouter = router({
  workspace: protectedProcedure
    .input(z.object({ experimentVersion: experimentVersionSchema }))
    .query(({ ctx, input }) => getWorkspace(ctx.user.id, input.experimentVersion)),
  history: protectedProcedure.query(({ ctx }) => getHistory(ctx.user.id)),
  generate: protectedProcedure.input(dailyCheckinInputSchema).mutation(async ({ ctx, input }) => {
    let serverHighLevelContext: string | undefined;
    const learning = await getEnabledLearningContextWithSources(ctx.user.id);
    const assignedPack = await getAssignedCreatorPackContext(ctx.user.id);
    if (input.experimentVersion === "founder") {
      const access = await getHighLevelAccessForUser(ctx.user.id);
      try {
        if (access) {
          const snapshot = await fetchHighLevelSnapshot({
            token: access.accessToken,
            locationId: access.connection.locationId,
          });
          serverHighLevelContext = snapshot.summary;
          await markHighLevelSync(ctx.user.id, access.connection.id);
        } else if (ctx.user.role === "admin" && getHighLevelStatus().configured) {
          serverHighLevelContext = (await fetchHighLevelSnapshot()).summary;
        }
      } catch (error) {
        if (access) {
          await markHighLevelSync(
            ctx.user.id,
            access.connection.id,
            error instanceof Error ? error.message : "GoHighLevel sync failed.",
          );
        }
      }
    }
    const packContext = assignedPack
      ? [
          `Assigned Creator Pack: ${assignedPack.packName} by ${assignedPack.creatorName || "creator"}.`,
          `Approved version: ${assignedPack.version.versionNumber}.`,
          ...assignedPack.knowledge.slice(0, 12).map(item => `[${item.knowledgeType}] ${item.content}`),
        ].join("\n")
      : "";
    const enrichedInput = {
      ...input,
      highLevelContext: serverHighLevelContext,
      learningContext: [learning.context, packContext].filter(Boolean).join("\n\n") || undefined,
    };
    const checkinId = await createCheckin(ctx.user.id, enrichedInput);
    await trackEvent(ctx.user.id, {
      experimentVersion: input.experimentVersion,
      eventName: "onboarding_completed",
    });
    const { recommendation, modelId } = await generateRecommendation(enrichedInput);
    if (recommendation.mode === "clarification") {
      await markCheckinNeedsClarification(
        ctx.user.id,
        checkinId,
        recommendation.clarificationQuestion,
      );
      return { mode: "clarification" as const, question: recommendation.clarificationQuestion };
    }
    const recommendationId = await saveRecommendation(
      ctx.user.id,
      checkinId,
      input.experimentVersion,
      recommendation,
      modelId,
    );
    await saveRecommendationLearningSources(ctx.user.id, recommendationId, learning.sourceIds);
    await saveCreatorPackRecommendationAttribution(ctx.user.id, recommendationId);
    await trackEvent(ctx.user.id, {
      experimentVersion: input.experimentVersion,
      eventName: "skoot_generated",
      metadata: { modelId },
    });
    return { mode: "recommendation" as const };
  }),
  setStatus: protectedProcedure
    .input(
      z.object({
        skootId: z.number().int().positive(),
        status: z.enum(["completed", "skipped"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const skoot = await updateSkootStatus(ctx.user.id, input.skootId, input.status);
      await trackEvent(ctx.user.id, {
        experimentVersion: skoot.experimentVersion,
        eventName: input.status === "completed" ? "skoot_completed" : "skoot_skipped",
      });
      return { success: true };
    }),
  reportOutcome: protectedProcedure
    .input(skootOutcomeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { outcomeId, experimentVersion } = await saveOutcome(ctx.user.id, input);
      await trackEvent(ctx.user.id, {
        experimentVersion,
        eventName: "outcome_reported",
      });
      return { outcomeId };
    }),
  track: publicProcedure.input(experimentEventInputSchema).mutation(({ ctx, input }) =>
    trackEvent(ctx.user?.id ?? null, input).then(() => ({ success: true })),
  ),
});
