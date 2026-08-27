import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { buildHighLevelActionSignals, generateNextActions } from "../actionEngine";
import {
  createBusinessActions,
  getBusinessActionById,
  getBusinessProfile,
  getBusinessSnapshot,
  getOpenBusinessActions,
  recordBusinessActionOutcome,
  upsertBusinessProfile,
  updateBusinessActionStatus,
} from "../db";
import { fetchHighLevelActionPayloads } from "../highlevel";
import { getHighLevelAccessForUser } from "../highlevelOAuth";

const profileInput = z.object({
  companyName: z.string().trim().min(2).max(300),
  primaryGoal: z.string().trim().min(2).max(2500),
  monthlyRevenueGoal: z.number().min(0).max(100000000).optional(),
  primaryOffer: z.string().trim().max(400).optional(),
  offerPrice: z.number().min(0).max(100000000).optional(),
  primaryAcquisitionMethod: z.string().trim().max(400).optional(),
  importantNotes: z.string().trim().max(5000).optional(),
  currentBottleneck: z.string().trim().max(2500).optional(),
  defaultPlaybookId: z.string().trim().max(120).optional(),
});

const actionStatusInput = z.object({ actionId: z.number().int().positive(), status: z.enum(["recommended", "in_progress", "completed", "dismissed"]) });
const outcomeInput = z.object({
  actionId: z.number().int().positive(),
  contactsContacted: z.number().int().min(0).max(100000).default(0),
  replies: z.number().int().min(0).max(100000).default(0),
  bookings: z.number().int().min(0).max(100000).default(0),
  purchases: z.number().int().min(0).max(100000).default(0),
  outcomeValue: z.number().min(0).max(100000000).optional(),
  notes: z.string().trim().max(5000).optional(),
  learningNote: z.string().trim().max(2500).optional(),
});

export const actionEngineRouter = router({
  getBusinessSnapshot: protectedProcedure.query(({ ctx }) => getBusinessSnapshot(ctx.user.id)),
  getNextActions: protectedProcedure.query(({ ctx }) => getOpenBusinessActions(ctx.user.id)),
  getActionDetails: protectedProcedure.input(z.object({ actionId: z.number().int().positive() })).query(({ ctx, input }) => getBusinessActionById(ctx.user.id, input.actionId)),
  saveProfile: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => upsertBusinessProfile(ctx.user.id, input)),
  generateNextActions: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getBusinessProfile(ctx.user.id);
    if (!profile) throw new Error("Set your business profile before generating actions.");
    const active = await getOpenBusinessActions(ctx.user.id);
    if (active.length) return { actions: active, reused: true };
    const access = await getHighLevelAccessForUser(ctx.user.id);
    if (!access) throw new Error("Connect your GoHighLevel account before generating CRM actions.");
    const payloads = await fetchHighLevelActionPayloads({ token: access.accessToken, locationId: access.connection.locationId });
    const candidates = generateNextActions(buildHighLevelActionSignals(payloads.contacts, payloads.opportunities, Date.now(), access.connection.locationId));
    const actions = await createBusinessActions(ctx.user.id, profile.id, candidates, profile.defaultPlaybookId);
    return { actions, reused: false };
  }),
  completeAction: protectedProcedure.input(actionStatusInput.extend({ status: z.literal("completed") })).mutation(({ ctx, input }) => updateBusinessActionStatus(ctx.user.id, input.actionId, input.status)),
  setActionStatus: protectedProcedure.input(actionStatusInput).mutation(({ ctx, input }) => updateBusinessActionStatus(ctx.user.id, input.actionId, input.status)),
  recordActionOutcome: protectedProcedure.input(outcomeInput).mutation(({ ctx, input }) => recordBusinessActionOutcome(ctx.user.id, input)),
});
