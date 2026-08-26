import { skootPackInputSchema, skootPromptResolveInputSchema } from "../../shared/skootly";
import { protectedProcedure, router } from "../_core/trpc";
import { createSkootPack, getSkootPacks } from "../db";
import { resolvePromptToPackAction } from "../skootPacks";

export const packsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getSkootPacks(ctx.user.id)),
  create: protectedProcedure.input(skootPackInputSchema).mutation(({ ctx, input }) =>
    createSkootPack(ctx.user.id, input).then(packId => ({ packId })),
  ),
  resolvePrompt: protectedProcedure.input(skootPromptResolveInputSchema).query(async ({ ctx, input }) => {
    const packs = await getSkootPacks(ctx.user.id);
    return resolvePromptToPackAction(input.prompt, packs);
  }),
});
