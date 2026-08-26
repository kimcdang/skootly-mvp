import { z } from "zod";
import { EXPERIMENT_VERSIONS } from "./experiments";

export const EXPERIMENT_EVENT_NAMES = [
  "landing_page_view",
  "onboarding_started",
  "onboarding_completed",
  "skoot_generated",
  "skoot_completed",
  "skoot_skipped",
  "outcome_reported",
  "signup_started",
  "signup_completed",
  "feedback_recorded",
] as const;

export const experimentVersionSchema = z.enum(EXPERIMENT_VERSIONS);
export const availableTimeSchema = z.enum([
  "15_minutes",
  "30_minutes",
  "60_minutes",
  "90_plus_minutes",
]);
export const energyLevelSchema = z.enum(["low", "steady", "high"]);
export const impactSchema = z.enum(["low", "medium", "high"]);

export const dailyCheckinInputSchema = z.object({
  experimentVersion: experimentVersionSchema,
  goal: z.string().trim().min(3).max(1200),
  currentState: z.string().trim().min(3).max(5000),
  blocker: z.string().trim().min(2).max(2500),
  availableTime: availableTimeSchema,
  energyLevel: energyLevelSchema,
  metricName: z.string().trim().max(160).optional(),
  currentValue: z.string().trim().max(120).optional(),
  targetValue: z.string().trim().max(120).optional(),
  opportunities: z.string().trim().max(3500).optional(),
  constraints: z.string().trim().max(3500).optional(),
  optionalContext: z.string().trim().max(8000).optional(),
  highLevelContext: z.string().trim().max(6000).optional(),
});

export const skootRecommendationSchema = z.object({
  title: z.string().trim().min(3).max(180),
  reasoning: z.string().trim().min(3).max(500),
  estimatedImpact: impactSchema,
});

export const recommendationOutputSchema = z.object({
  mode: z.enum(["recommendation", "clarification"]),
  clarificationQuestion: z.string().max(280),
  goal: z.string().max(500),
  bottleneck: z.string().max(500),
  why: z.string().max(700),
  primarySkoot: skootRecommendationSchema,
  secondarySkoot: z.object({
    enabled: z.boolean(),
    title: z.string().max(180),
    reasoning: z.string().max(500),
    estimatedImpact: impactSchema,
  }),
  notToday: z.array(z.string().min(2).max(160)).max(3),
  notTodayReason: z.string().max(500),
});

export const skootOutcomeInputSchema = z.object({
  skootId: z.number().int().positive(),
  outcomeType: z.enum([
    "no_result_yet",
    "made_progress",
    "completed_milestone",
    "received_reply",
    "booked_call",
    "generated_revenue",
    "retained_client",
    "other",
  ]),
  measurableOutcome: z.string().trim().max(1000).optional(),
  revenueAmount: z.number().min(0).max(999999999999).optional(),
  notes: z.string().trim().max(2500).optional(),
  userFeedback: z.string().trim().max(1000).optional(),
});

const optionalSecureUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(value => new URL(value).protocol === "https:", "Use an HTTPS source link.")
  .optional()
  .or(z.literal(""));

export const manualLearningSourceInputSchema = z
  .object({
    provider: z.enum(["skool_manual", "other_manual"]),
    title: z.string().trim().min(2).max(300),
    communityName: z.string().trim().max(300).optional(),
    lessonUrl: optionalSecureUrl,
    sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD source date.").optional(),
    transcript: z.string().trim().max(60000).optional(),
    homework: z.string().trim().max(15000).optional(),
    consentConfirmed: z.literal(true),
  })
  .superRefine((value, ctx) => {
    if (!value.transcript && !value.homework) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paste a transcript/caption, homework, or both.",
        path: ["transcript"],
      });
    }
  });

export const learningSourceToggleInputSchema = z.object({
  sourceId: z.number().int().positive(),
  enabled: z.boolean(),
});

export const learningHomeworkStatusInputSchema = z.object({
  homeworkId: z.number().int().positive(),
  status: z.enum(["pending", "completed", "dismissed"]),
});

export const learningSourceDeleteInputSchema = z.object({
  sourceId: z.number().int().positive(),
  confirmPermanentDeletion: z.literal(true),
});

const userOwnedHttpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(value => new URL(value).protocol === "https:", "Use an HTTPS URL.");

export const groupContextInputSchema = z.object({
  platform: z.enum(["skool", "other"]),
  name: z.string().trim().min(2).max(300),
  groupUrl: userOwnedHttpsUrl,
  settingsUrl: userOwnedHttpsUrl.optional().or(z.literal("")),
  settingsLabel: z.string().trim().max(160).optional(),
});

const skootPackStepInputSchema = z.object({
  actionType: z.enum(["asset_preparation", "platform_setup", "homework", "engagement"]),
  actionTitle: z.string().trim().min(4).max(700),
  rationale: z.string().trim().min(4).max(1500),
  assetDeliverable: z.string().trim().max(300).optional(),
  assetWidth: z.number().int().positive().max(10000).optional(),
  assetHeight: z.number().int().positive().max(10000).optional(),
  assetFormatHints: z.array(z.string().trim().min(2).max(80)).max(8).optional(),
  requiresConfirmation: z.boolean().default(false),
});

export const skootPackInputSchema = z.object({
  group: groupContextInputSchema.optional(),
  title: z.string().trim().min(3).max(300),
  triggerPhrases: z.array(z.string().trim().min(2).max(160)).min(1).max(8),
  goal: z.string().trim().min(4).max(2500),
  notes: z.string().trim().max(5000).optional(),
  steps: z.array(skootPackStepInputSchema).min(1).max(20),
});

export const skootPromptResolveInputSchema = z.object({
  prompt: z.string().trim().min(3).max(3000),
});

export const conversationStartInputSchema = z.object({
  consentConfirmed: z.literal(true),
  title: z.string().trim().min(2).max(300).optional(),
});

export const conversationSendInputSchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().trim().min(1).max(6000),
});

export const conversationDeleteInputSchema = z.object({
  conversationId: z.number().int().positive(),
  confirmPermanentDeletion: z.literal(true),
});

export const validationFeedbackInputSchema = z.object({
  experimentVersion: experimentVersionSchema,
  participantName: z.string().trim().min(1).max(200),
  perceivedPurpose: z.string().trim().min(2).max(2500),
  wouldUse: z.enum(["definitely", "maybe", "no"]),
  wouldPay: z.enum(["yes", "maybe", "no"]),
  suggestedMonthlyPrice: z.number().min(0).max(100000).optional(),
  mostInterestingFeature: z.string().trim().max(1500).optional(),
  confusion: z.string().trim().max(1500).optional(),
  notes: z.string().trim().max(2500).optional(),
});

export const experimentEventInputSchema = z.object({
  experimentVersion: z.string().trim().min(2).max(32),
  eventName: z.enum(EXPERIMENT_EVENT_NAMES),
  sessionId: z.string().trim().max(96).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DailyCheckinInput = z.infer<typeof dailyCheckinInputSchema>;
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
