import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { chooseEscalation, validateBookingUrl } from "../escalations";
import { createBreakdownNote, createContentSkootSuggestions, createSmartEscalation, getCreatorEscalations, getEscalationBrief, getStudentEscalations, getSupportNotifications, getSupportProfiles, getStudentEscalationRoute, grantIdentifiableContentConsent, revokeIdentifiableContentConsent, saveSupportProfile, updateEscalationStatus, updateSupportNotification } from "../db";

const levelSchema = z.enum(["csm", "coach"]);
export const escalationsRouter = router({
  supportProfiles: protectedProcedure.query(({ ctx }) => getSupportProfiles(ctx.user.id)),
  saveSupportProfile: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), routingLevel: levelSchema, displayName: z.string().trim().min(2).max(300), bookingUrl: z.string().url().max(2048).optional(), assigneeEmail: z.string().trim().email().optional(), active: z.boolean().optional() })).mutation(({ ctx, input }) => saveSupportProfile(ctx.user.id, { ...input, bookingUrl: validateBookingUrl(input.bookingUrl) })),
  notifications: protectedProcedure.query(({ ctx }) => getSupportNotifications(ctx.user.id)),
  updateNotification: protectedProcedure.input(z.object({ notificationId: z.number().int().positive(), action: z.enum(["read", "dismiss"]) })).mutation(({ ctx, input }) => updateSupportNotification(ctx.user.id, input.notificationId, input.action)),
  grantIdentifiableConsent: protectedProcedure.input(z.object({ creatorUserId: z.number().int().positive(), scope: z.enum(["name", "result", "recording", "screenshot", "business_info"]), purpose: z.string().trim().min(8).max(1000) })).mutation(({ ctx, input }) => grantIdentifiableContentConsent(ctx.user.id, input)),
  revokeIdentifiableConsent: protectedProcedure.input(z.object({ creatorUserId: z.number().int().positive(), scope: z.enum(["name", "result", "recording", "screenshot", "business_info"]) })).mutation(({ ctx, input }) => revokeIdentifiableContentConsent(ctx.user.id, input)),
  mine: protectedProcedure.query(({ ctx }) => getStudentEscalations(ctx.user.id)),
  creatorQueue: protectedProcedure.query(({ ctx }) => getCreatorEscalations(ctx.user.id)),
  request: protectedProcedure.input(z.object({ relatedSkootId: z.number().int().positive().optional(), relatedRecommendationId: z.number().int().positive().optional(), explicitlyRequestsHuman: z.boolean(), strategyNeeded: z.boolean(), studentNote: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
    const route = await getStudentEscalationRoute(ctx.user.id, input.relatedSkootId);
    if (!route) throw new Error("A current Creator Pack assignment is required before requesting a private breakdown.");
    const decision = chooseEscalation({ ...input, repeatedAttempts: route.repeatedAttempts, hasRelevantPackRule: route.hasRelevantPackRule, hasCsm: Boolean(route.csm), hasCoach: Boolean(route.coach) });
    if (!decision) return { mode: "self_serve" as const, message: "Your current Pack has a relevant next step. Complete it first, then request support if the bottleneck persists." };
    const profile = decision.level === "csm" ? route.csm : route.coach;
    return createSmartEscalation({ creatorUserId: route.creatorUserId, studentUserId: ctx.user.id, supportProfileId: profile?.id ?? null, relatedSkootId: input.relatedSkootId ?? null, relatedRecommendationId: input.relatedRecommendationId ?? null, packId: route.packId, escalationType: decision.level, routingReason: `${decision.reason}${input.studentNote ? ` Student note: ${input.studentNote}` : ""}`, bookingUrl: profile?.bookingUrl ?? null });
  }),
  markBooked: protectedProcedure.input(z.object({ escalationId: z.number().int().positive() })).mutation(({ ctx, input }) => updateEscalationStatus({ actorUserId: ctx.user.id, escalationId: input.escalationId, allowed: "student", status: "booked" })),
  brief: protectedProcedure.input(z.object({ escalationId: z.number().int().positive() })).query(({ ctx, input }) => getEscalationBrief(ctx.user.id, input.escalationId)),
  complete: protectedProcedure.input(z.object({ escalationId: z.number().int().positive() })).mutation(({ ctx, input }) => updateEscalationStatus({ actorUserId: ctx.user.id, escalationId: input.escalationId, allowed: "creator", status: "completed" })),
  addBreakdownNote: protectedProcedure.input(z.object({ escalationId: z.number().int().positive(), notes: z.string().trim().min(4).max(10000), clientNextAction: z.string().trim().max(2000).optional(), proposedKnowledgeType: z.enum(["principle", "framework", "diagnostic_rule", "decision_rule", "milestone", "skoot_action", "script", "not_today", "example"]).optional(), proposedKnowledgeContent: z.string().trim().max(5000).optional() })).mutation(({ ctx, input }) => createBreakdownNote(ctx.user.id, input)),
  contentSuggestions: protectedProcedure.query(({ ctx }) => createContentSkootSuggestions(ctx.user.id)),
});
