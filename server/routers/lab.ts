import { validationFeedbackInputSchema } from "../../shared/skootly";
import { adminProcedure, router } from "../_core/trpc";
import { getValidationMetrics, saveFeedback, trackEvent } from "../db";

export const labRouter = router({
  metrics: adminProcedure.query(({ ctx }) => getValidationMetrics(ctx.user.id)),
  saveFeedback: adminProcedure
    .input(validationFeedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      const feedbackId = await saveFeedback(ctx.user.id, input);
      await trackEvent(ctx.user.id, {
        experimentVersion: input.experimentVersion,
        eventName: "feedback_recorded",
      });
      return { feedbackId };
    }),
});
