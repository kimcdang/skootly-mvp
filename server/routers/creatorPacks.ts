import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { creatorKnowledgeTypes, proposeCreatorKnowledge } from "../creatorPacks";
import { acceptCreatorPackInvite, approveCreatorPackProposal, assignCreatorPackStudent, cancelCreatorPackProposal, createCreatorPack, createCreatorPackInvite, createCreatorPackProposal, createGuidedCreatorPack, getCreatorPackBuilder, getCreatorPackInsights, getCreatorPackInvitePreview, getCreatorPackInvites, getCreatorPackOperatingView, getCreatorPacks, getCreatorPackProposals, getMyPackExecution, getMyPackJourney, publishGuidedCreatorPackRevision, recordMyPackExecutionFeedback, revokeCreatorPackInvite, rollEnrollmentToActiveVersion, saveMyPackDiagnosticAnswer } from "../db";
import { packTemplateKinds, starterPackDraft, validatePackBlueprintDraft } from "../packMvp";
import { shapePackFromNotes } from "../packAuthoring";

const knowledgeType = z.enum(creatorKnowledgeTypes);
const templateKind = z.enum(packTemplateKinds);
const milestoneInput = z.object({
  position: z.number().int().min(1).max(7),
  title: z.string().trim().min(2).max(300),
  definitionOfDone: z.string().trim().min(2).max(3000),
  defaultSkoot: z.string().trim().min(2).max(3000),
  supportingSkoot: z.string().trim().min(2).max(3000).optional(),
  feedbackPrompt: z.string().trim().min(2).max(3000),
  resourceUrl: z.string().trim().url().max(2048).refine(value => /^https:\/\//i.test(value), "Use a full HTTPS link.").optional(),
  assetSpec: z.string().trim().max(1000).optional(),
  notToday: z.string().trim().max(3000).optional(),
});
const blueprintInput = z.object({
  templateKind,
  name: z.string().trim().min(2).max(300),
  description: z.string().trim().max(3000).optional(),
  destination: z.string().trim().min(2).max(3000),
  audience: z.string().trim().min(2).max(3000),
  cadenceLabel: z.string().trim().min(2).max(300),
  notToday: z.string().trim().max(3000).optional(),
  milestones: z.array(milestoneInput).min(3).max(7),
});
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
  starterDraft: protectedProcedure.input(z.object({ templateKind })).query(({ input }) => starterPackDraft(input.templateKind)),
  shapeDraft: protectedProcedure.input(z.object({ templateKind, notes: z.string().trim().min(50).max(6000), confirmedNoPrivateData: z.literal(true) })).mutation(({ input }) => shapePackFromNotes(input)),
  builder: protectedProcedure.input(z.object({ packId: z.number().int().positive() })).query(({ ctx, input }) => getCreatorPackBuilder(ctx.user.id, input.packId)),
  createGuided: protectedProcedure.input(blueprintInput).mutation(({ ctx, input }) => { validatePackBlueprintDraft(input); return createGuidedCreatorPack(ctx.user.id, input); }),
  publishGuided: protectedProcedure.input(z.object({ packId: z.number().int().positive(), draft: blueprintInput })).mutation(({ ctx, input }) => { validatePackBlueprintDraft(input.draft); return publishGuidedCreatorPackRevision(ctx.user.id, input.packId, input.draft); }),
  createInvite: protectedProcedure.input(z.object({ packId: z.number().int().positive(), email: z.string().trim().email().max(320), expiresInDays: z.number().int().min(1).max(30).default(7) })).mutation(({ ctx, input }) => createCreatorPackInvite(ctx.user.id, input.packId, input.email, input.expiresInDays)),
  listInvites: protectedProcedure.input(z.object({ packId: z.number().int().positive() })).query(({ ctx, input }) => getCreatorPackInvites(ctx.user.id, input.packId)),
  revokeInvite: protectedProcedure.input(z.object({ inviteId: z.number().int().positive() })).mutation(({ ctx, input }) => revokeCreatorPackInvite(ctx.user.id, input.inviteId)),
  invitePreview: protectedProcedure.input(z.object({ token: z.string().min(40).max(200) })).query(({ input }) => getCreatorPackInvitePreview(input.token)),
  acceptInvite: protectedProcedure.input(z.object({ token: z.string().min(40).max(200) })).mutation(({ ctx, input }) => acceptCreatorPackInvite(ctx.user.id, ctx.user.email, input.token)),
  myExecution: protectedProcedure.query(({ ctx }) => getMyPackExecution(ctx.user.id)),
  recordExecutionFeedback: protectedProcedure.input(z.object({ feedbackStatus: z.enum(["done", "stuck", "not_today"]), detail: z.string().trim().max(3000).optional() })).mutation(({ ctx, input }) => recordMyPackExecutionFeedback(ctx.user.id, input)),
  operatingView: protectedProcedure.input(z.object({ packId: z.number().int().positive() })).query(({ ctx, input }) => getCreatorPackOperatingView(ctx.user.id, input.packId)),
  rollEnrollmentForward: protectedProcedure.input(z.object({ enrollmentId: z.number().int().positive() })).mutation(({ ctx, input }) => rollEnrollmentToActiveVersion(ctx.user.id, input.enrollmentId)),
});
