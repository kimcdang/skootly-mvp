import {
  learningHomeworkStatusInputSchema,
  learningSourceDeleteInputSchema,
  learningSourceToggleInputSchema,
  manualLearningSourceInputSchema,
} from "../../shared/skootly";
import { protectedProcedure, router } from "../_core/trpc";
import {
  deleteLearningSource,
  getLearningSources,
  importLearningSource,
  setLearningHomeworkStatus,
  setLearningSourceEnabled,
} from "../db";

export const learningRouter = router({
  list: protectedProcedure.query(({ ctx }) => getLearningSources(ctx.user.id)),
  import: protectedProcedure.input(manualLearningSourceInputSchema).mutation(({ ctx, input }) =>
    importLearningSource(ctx.user.id, input).then(sourceId => ({ sourceId })),
  ),
  setEnabled: protectedProcedure.input(learningSourceToggleInputSchema).mutation(({ ctx, input }) =>
    setLearningSourceEnabled(ctx.user.id, input.sourceId, input.enabled).then(() => ({ success: true })),
  ),
  setHomeworkStatus: protectedProcedure
    .input(learningHomeworkStatusInputSchema)
    .mutation(({ ctx, input }) =>
      setLearningHomeworkStatus(ctx.user.id, input.homeworkId, input.status).then(() => ({ success: true })),
    ),
  delete: protectedProcedure.input(learningSourceDeleteInputSchema).mutation(({ ctx, input }) =>
    deleteLearningSource(ctx.user.id, input.sourceId).then(() => ({ success: true })),
  ),
});
