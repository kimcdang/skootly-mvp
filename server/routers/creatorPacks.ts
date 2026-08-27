import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { creatorKnowledgeTypes, proposeCreatorKnowledge } from "../creatorPacks";
import { approveCreatorPackProposal, assignCreatorPackStudent, cancelCreatorPackProposal, createCreatorPack, createCreatorPackProposal, getCreatorPackInsights, getCreatorPacks, getCreatorPackProposals, getMyPackJourney, saveMyPackDiagnosticAnswer } from "../db";

const knowledgeType = z.enum(creatorKnowledgeTypes);
export const creatorPacksRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCreatorPacks(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(300), description: z.string().trim().max(3000).optional() })).mutation(({ ctx, input }) => createCreatorPack(ctx.user.id, input)),
  listProposals: protectedProcedure.input(z.object({ packId: z.number().int().positive() })).query(({ ctx, input }) => getCreatorPackProposals(ctx.user.id, input.packId)),
  propose: protectedProcedure.input(z.object({ packId: z.number().int().positive(), sourceText: z.string().trim().min(4).max(5000), knowledgeType: knowledgeType.optional() })).mutation(({ ctx, input }) => {
    const proposal = proposeCreatorKnowledge(input.sourceText, input.knowledgeType);
    return createCreatorPackProposal(ctx.user.id, input.packId, input.sourceText, proposal);
  }),
  approve: protectedProcedure.input(z.object({ proposalId: z.number().int().positive(), content: z.string().trim().min(2).max(5000).optional(), knowledgeType: knowledgeType.optional() })).mutation(({ ctx, input }) => approveCreatorPackProposal(ctx.user.id, input)),
  cancel: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).mutation(({ ctx, input }) => cancelCreatorPackProposal(ctx.user.id, input.proposalId)),
  assign: protectedProcedure.input(z.object({ packId: z.number().int().positive(), studentEmail: z.string().email().max(320) })).mutation(({ ctx, input }) => assignCreatorPackStudent(ctx.user.id, input.packId, input.studentEmail)),
  insights: protectedProcedure.query(({ ctx }) => getCreatorPackInsights(ctx.user.id)),
  myJourney: protectedProcedure.query(({ ctx }) => getMyPackJourney(ctx.user.id)),
  answerDiagnostic: protectedProcedure.input(z.object({ questionKey: z.string().min(1).max(255), questionText: z.string().min(2).max(2000), answer: z.string().min(1).max(1000) })).mutation(({ ctx, input }) => saveMyPackDiagnosticAnswer(ctx.user.id, input)),
});
