import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  dailyCheckins,
  experimentEvents,
  InsertUser,
  recommendations,
  skootOutcomes,
  skoots,
  users,
  validationFeedback,
} from "../drizzle/schema";
import type { ExperimentVersion } from "../shared/experiments";
import type { DailyCheckinInput, RecommendationOutput } from "../shared/skootly";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function createCheckin(userId: number, input: DailyCheckinInput) {
  const db = await requireDb();
  const optionalContext = [input.optionalContext, input.highLevelContext]
    .filter(Boolean)
    .join("\n\n") || null;
  const [created] = await db
    .insert(dailyCheckins)
    .values({
      userId,
      experimentVersion: input.experimentVersion,
      goal: input.goal,
      currentState: input.currentState,
      blocker: input.blocker,
      availableTime: input.availableTime,
      energyLevel: input.energyLevel,
      metricName: input.metricName || null,
      currentValue: input.currentValue || null,
      targetValue: input.targetValue || null,
      opportunities: input.opportunities || null,
      constraints: input.constraints || null,
      optionalContext,
      createdAt: Date.now(),
    })
    .$returningId();
  return created.id;
}

export async function markCheckinNeedsClarification(
  userId: number,
  checkinId: number,
  clarificationQuestion: string,
) {
  const db = await requireDb();
  await db
    .update(dailyCheckins)
    .set({ status: "needs_clarification", clarificationQuestion })
    .where(and(eq(dailyCheckins.id, checkinId), eq(dailyCheckins.userId, userId)));
}

export async function saveRecommendation(
  userId: number,
  checkinId: number,
  experimentVersion: ExperimentVersion,
  result: RecommendationOutput,
  modelId: string,
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [created] = await tx
      .insert(recommendations)
      .values({
        userId,
        checkinId,
        experimentVersion,
        goalSummary: result.goal,
        bottleneck: result.bottleneck,
        rationale: result.why,
        notTodayItems: JSON.stringify(result.notToday.slice(0, 3)),
        notTodayReason: result.notTodayReason,
        modelId,
        createdAt: Date.now(),
      })
      .$returningId();

    const actions = [result.primarySkoot];
    if (result.secondarySkoot.enabled) {
      actions.push({
        title: result.secondarySkoot.title,
        reasoning: result.secondarySkoot.reasoning,
        estimatedImpact: result.secondarySkoot.estimatedImpact,
      });
    }
    await tx.insert(skoots).values(
      actions.slice(0, 2).map((action, index) => ({
        userId,
        checkinId,
        recommendationId: created.id,
        experimentVersion,
        title: action.title,
        reasoning: action.reasoning,
        estimatedImpact: action.estimatedImpact,
        position: index + 1,
        createdAt: Date.now(),
      })),
    );
    await tx
      .update(dailyCheckins)
      .set({ status: "recommended", clarificationQuestion: null })
      .where(and(eq(dailyCheckins.id, checkinId), eq(dailyCheckins.userId, userId)));
    return created.id;
  });
}

export async function getWorkspace(userId: number, experimentVersion: ExperimentVersion) {
  const db = await requireDb();
  const latest = (
    await db
      .select({ recommendation: recommendations, checkin: dailyCheckins })
      .from(recommendations)
      .innerJoin(dailyCheckins, eq(recommendations.checkinId, dailyCheckins.id))
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.experimentVersion, experimentVersion),
        ),
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(1)
  )[0];
  if (!latest) {
    const clarification = (
      await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            eq(dailyCheckins.experimentVersion, experimentVersion),
            eq(dailyCheckins.status, "needs_clarification"),
          ),
        )
        .orderBy(desc(dailyCheckins.createdAt))
        .limit(1)
    )[0];
    return clarification
      ? { mode: "clarification" as const, clarificationQuestion: clarification.clarificationQuestion }
      : null;
  }

  const actions = await db
    .select()
    .from(skoots)
    .where(
      and(
        eq(skoots.userId, userId),
        eq(skoots.recommendationId, latest.recommendation.id),
      ),
    )
    .orderBy(skoots.position);

  return {
    mode: "recommendation" as const,
    checkin: latest.checkin,
    recommendation: {
      ...latest.recommendation,
      notTodayItems: JSON.parse(latest.recommendation.notTodayItems) as string[],
    },
    skoots: actions,
  };
}

export async function getHistory(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      skoot: skoots,
      goal: dailyCheckins.goal,
      bottleneck: recommendations.bottleneck,
    })
    .from(skoots)
    .innerJoin(dailyCheckins, eq(skoots.checkinId, dailyCheckins.id))
    .innerJoin(recommendations, eq(skoots.recommendationId, recommendations.id))
    .where(eq(skoots.userId, userId))
    .orderBy(desc(skoots.createdAt))
    .limit(40);
  const ids = rows.map(row => row.skoot.id);
  const outcomes = ids.length
    ? await db
        .select()
        .from(skootOutcomes)
        .where(and(eq(skootOutcomes.userId, userId), inArray(skootOutcomes.skootId, ids)))
    : [];
  const bySkoot = new Map(outcomes.map(outcome => [outcome.skootId, outcome]));
  return rows.map(row => ({ ...row, outcome: bySkoot.get(row.skoot.id) ?? null }));
}

export async function updateSkootStatus(
  userId: number,
  skootId: number,
  status: "completed" | "skipped",
) {
  const db = await requireDb();
  const existing = (
    await db
      .select()
      .from(skoots)
      .where(and(eq(skoots.id, skootId), eq(skoots.userId, userId)))
      .limit(1)
  )[0];
  if (!existing) throw new Error("Skoot not found.");
  await db
    .update(skoots)
    .set({ status, completedAt: Date.now() })
    .where(and(eq(skoots.id, skootId), eq(skoots.userId, userId)));
  return existing;
}

export async function saveOutcome(
  userId: number,
  input: {
    skootId: number;
    outcomeType:
      | "no_result_yet"
      | "made_progress"
      | "completed_milestone"
      | "received_reply"
      | "booked_call"
      | "generated_revenue"
      | "retained_client"
      | "other";
    measurableOutcome?: string;
    revenueAmount?: number;
    notes?: string;
    userFeedback?: string;
  },
) {
  const db = await requireDb();
  const owned = (
    await db
      .select({ id: skoots.id })
      .from(skoots)
      .where(and(eq(skoots.id, input.skootId), eq(skoots.userId, userId)))
      .limit(1)
  )[0];
  if (!owned) throw new Error("Skoot not found.");
  const [created] = await db
    .insert(skootOutcomes)
    .values({
      userId,
      skootId: input.skootId,
      outcomeType: input.outcomeType,
      measurableOutcome: input.measurableOutcome || null,
      revenueAmount:
        input.revenueAmount === undefined ? null : input.revenueAmount.toFixed(2),
      notes: input.notes || null,
      userFeedback: input.userFeedback || null,
      createdAt: Date.now(),
    })
    .$returningId();
  return created.id;
}

export async function trackEvent(
  userId: number | null,
  input: {
    experimentVersion: string;
    eventName:
      | "landing_page_view"
      | "onboarding_started"
      | "onboarding_completed"
      | "skoot_generated"
      | "skoot_completed"
      | "skoot_skipped"
      | "outcome_reported"
      | "signup_started"
      | "signup_completed"
      | "feedback_recorded";
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const db = await requireDb();
  await db.insert(experimentEvents).values({
    userId,
    experimentVersion: input.experimentVersion,
    eventName: input.eventName,
    sessionId: input.sessionId || null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: Date.now(),
  });
}

export async function saveFeedback(
  userId: number,
  input: {
    experimentVersion: ExperimentVersion;
    participantName: string;
    perceivedPurpose: string;
    wouldUse: "definitely" | "maybe" | "no";
    wouldPay: "yes" | "maybe" | "no";
    suggestedMonthlyPrice?: number;
    mostInterestingFeature?: string;
    confusion?: string;
    notes?: string;
  },
) {
  const db = await requireDb();
  const [created] = await db
    .insert(validationFeedback)
    .values({
      userId,
      ...input,
      suggestedMonthlyPrice:
        input.suggestedMonthlyPrice === undefined
          ? null
          : input.suggestedMonthlyPrice.toFixed(2),
      mostInterestingFeature: input.mostInterestingFeature || null,
      confusion: input.confusion || null,
      notes: input.notes || null,
      createdAt: Date.now(),
    })
    .$returningId();
  return created.id;
}

export async function getValidationMetrics(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(validationFeedback)
    .where(eq(validationFeedback.userId, userId));
  const versions: ExperimentVersion[] = ["founder", "coach", "client_success"];
  return versions.map(version => {
    const items = rows.filter(row => row.experimentVersion === version);
    const priced = items
      .map(row => (row.suggestedMonthlyPrice ? Number(row.suggestedMonthlyPrice) : null))
      .filter((value): value is number => value !== null);
    return {
      experimentVersion: version,
      demos: items.length,
      definitelyWouldUse: items.filter(row => row.wouldUse === "definitely").length,
      wouldPay: items.filter(row => row.wouldPay === "yes").length,
      averageSuggestedPrice: priced.length
        ? priced.reduce((sum, value) => sum + value, 0) / priced.length
        : 0,
    };
  });
}
