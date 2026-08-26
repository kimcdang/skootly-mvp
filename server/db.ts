import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  dailyCheckins,
  experimentEvents,
  groupContexts,
  InsertUser,
  learningHomeworkItems,
  learningSourceAudit,
  learningSources,
  recommendations,
  recommendationLearningSources,
  skootPacks,
  skootPackSteps,
  skootOutcomes,
  skoots,
  users,
  validationFeedback,
} from "../drizzle/schema";
import type { ExperimentVersion } from "../shared/experiments";
import type { DailyCheckinInput, RecommendationOutput } from "../shared/skootly";
import { ENV } from "./_core/env";
import {
  buildLearningContext,
  deriveLearningConcepts,
  hashLearningSource,
  parseHomeworkItems,
  sanitizeLearningText,
  MAX_HOMEWORK_CHARS,
  MAX_TRANSCRIPT_CHARS,
} from "./learning";

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
  const learningCitations = await db
    .select({
      title: learningSources.title,
      lessonUrl: learningSources.lessonUrl,
      citationReason: recommendationLearningSources.citationReason,
    })
    .from(recommendationLearningSources)
    .innerJoin(learningSources, eq(recommendationLearningSources.sourceId, learningSources.id))
    .where(
      and(
        eq(recommendationLearningSources.userId, userId),
        eq(recommendationLearningSources.recommendationId, latest.recommendation.id),
        eq(learningSources.userId, userId),
      ),
    );

  return {
    mode: "recommendation" as const,
    checkin: latest.checkin,
    recommendation: {
      ...latest.recommendation,
      notTodayItems: JSON.parse(latest.recommendation.notTodayItems) as string[],
    },
    skoots: actions,
    learningCitations,
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
  const recommendationIds = Array.from(new Set(rows.map(row => row.skoot.recommendationId)));
  const citationRows = recommendationIds.length
    ? await db
        .select({
          recommendationId: recommendationLearningSources.recommendationId,
          title: learningSources.title,
          lessonUrl: learningSources.lessonUrl,
        })
        .from(recommendationLearningSources)
        .innerJoin(learningSources, eq(recommendationLearningSources.sourceId, learningSources.id))
        .where(
          and(
            eq(recommendationLearningSources.userId, userId),
            eq(learningSources.userId, userId),
            inArray(recommendationLearningSources.recommendationId, recommendationIds),
          ),
        )
    : [];
  const citationsByRecommendation = new Map<number, Array<{ title: string; lessonUrl: string | null }>>();
  citationRows.forEach(row => {
    citationsByRecommendation.set(row.recommendationId, [
      ...(citationsByRecommendation.get(row.recommendationId) || []),
      { title: row.title, lessonUrl: row.lessonUrl },
    ]);
  });
  return rows.map(row => ({
    ...row,
    outcome: bySkoot.get(row.skoot.id) ?? null,
    learningCitations: citationsByRecommendation.get(row.skoot.recommendationId) || [],
  }));
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
  if (!canTransitionSkootStatus(existing.status, status)) {
    throw new Error(`Skoot is already ${existing.status}.`);
  }
  await db
    .update(skoots)
    .set({ status, completedAt: Date.now() })
    .where(and(eq(skoots.id, skootId), eq(skoots.userId, userId)));
  return existing;
}

export function canTransitionSkootStatus(
  current: "active" | "completed" | "skipped",
  next: "completed" | "skipped",
) {
  return current === "active" && (next === "completed" || next === "skipped");
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
      .select({ id: skoots.id, experimentVersion: skoots.experimentVersion })
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
  return { outcomeId: created.id, experimentVersion: owned.experimentVersion };
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

export async function importLearningSource(
  userId: number,
  input: {
    provider: "skool_manual" | "other_manual";
    title: string;
    communityName?: string;
    lessonUrl?: string;
    sourceDate?: string;
    transcript?: string;
    homework?: string;
  },
) {
  const db = await requireDb();
  const transcript = sanitizeLearningText(input.transcript, MAX_TRANSCRIPT_CHARS);
  const homework = sanitizeLearningText(input.homework, MAX_HOMEWORK_CHARS);
  const normalizedConcepts = deriveLearningConcepts(transcript);
  const sourceHash = hashLearningSource({ ...input, transcript, homework });
  const existing = (
    await db
      .select({ id: learningSources.id })
      .from(learningSources)
      .where(and(eq(learningSources.userId, userId), eq(learningSources.sourceHash, sourceHash)))
      .limit(1)
  )[0];
  if (existing) throw new Error("You already imported this learning source.");
  const now = Date.now();
  return db.transaction(async tx => {
    const [created] = await tx
      .insert(learningSources)
      .values({
        userId,
        provider: input.provider,
        title: input.title.trim(),
        communityName: input.communityName?.trim() || null,
        lessonUrl: input.lessonUrl?.trim() || null,
        sourceDate: input.sourceDate ? Date.parse(`${input.sourceDate}T00:00:00.000Z`) : null,
        transcript: transcript || null,
        homework: homework || null,
        normalizedConcepts: normalizedConcepts.length ? JSON.stringify(normalizedConcepts) : null,
        sourceHash,
        consentedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();
    const homeworkItems = parseHomeworkItems(homework);
    if (homeworkItems.length) {
      await tx.insert(learningHomeworkItems).values(
        homeworkItems.map(item => ({
          userId,
          sourceId: created.id,
          title: item.title,
          details: item.details,
          engagementType: item.engagementType,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await tx.insert(learningSourceAudit).values({
      userId,
      sourceHash,
      action: "imported",
      createdAt: now,
    });
    return created.id;
  });
}

export async function getLearningSources(userId: number) {
  const db = await requireDb();
  const sources = await db
    .select()
    .from(learningSources)
    .where(eq(learningSources.userId, userId))
    .orderBy(desc(learningSources.createdAt));
  const sourceIds = sources.map(source => source.id);
  const homework = sourceIds.length
    ? await db
        .select()
        .from(learningHomeworkItems)
        .where(and(eq(learningHomeworkItems.userId, userId), inArray(learningHomeworkItems.sourceId, sourceIds)))
        .orderBy(desc(learningHomeworkItems.createdAt))
    : [];
  return sources.map(source => ({
    ...source,
    concepts: source.normalizedConcepts ? (JSON.parse(source.normalizedConcepts) as string[]) : [],
    homeworkItems: homework.filter(item => item.sourceId === source.id),
  }));
}

export async function setLearningSourceEnabled(userId: number, sourceId: number, enabled: boolean) {
  const db = await requireDb();
  const result = await db
    .update(learningSources)
    .set({ enabled, updatedAt: Date.now() })
    .where(and(eq(learningSources.id, sourceId), eq(learningSources.userId, userId)));
  if (!result[0]?.affectedRows) throw new Error("Learning source not found.");
}

export async function setLearningHomeworkStatus(
  userId: number,
  homeworkId: number,
  status: "pending" | "completed" | "dismissed",
) {
  const db = await requireDb();
  const result = await db
    .update(learningHomeworkItems)
    .set({
      status,
      completedAt: status === "completed" ? Date.now() : null,
      updatedAt: Date.now(),
    })
    .where(and(eq(learningHomeworkItems.id, homeworkId), eq(learningHomeworkItems.userId, userId)));
  if (!result[0]?.affectedRows) throw new Error("Homework item not found.");
}

export async function deleteLearningSource(userId: number, sourceId: number) {
  const db = await requireDb();
  const source = (
    await db
      .select({ sourceHash: learningSources.sourceHash })
      .from(learningSources)
      .where(and(eq(learningSources.id, sourceId), eq(learningSources.userId, userId)))
      .limit(1)
  )[0];
  if (!source) throw new Error("Learning source not found.");
  await db.transaction(async tx => {
    await tx.insert(learningSourceAudit).values({
      userId,
      sourceHash: source.sourceHash,
      action: "deleted",
      createdAt: Date.now(),
    });
    await tx
      .delete(learningSources)
      .where(and(eq(learningSources.id, sourceId), eq(learningSources.userId, userId)));
  });
}

export async function getEnabledLearningContext(userId: number) {
  const db = await requireDb();
  const sources = await db
    .select({
      title: learningSources.title,
      communityName: learningSources.communityName,
      lessonUrl: learningSources.lessonUrl,
      transcript: learningSources.transcript,
      homework: learningSources.homework,
      normalizedConcepts: learningSources.normalizedConcepts,
    })
    .from(learningSources)
    .where(and(eq(learningSources.userId, userId), eq(learningSources.enabled, true)))
    .orderBy(desc(learningSources.updatedAt))
    .limit(5);
  return buildLearningContext(sources);
}

export async function getEnabledLearningContextWithSources(userId: number) {
  const db = await requireDb();
  const sources = await db
    .select({
      id: learningSources.id,
      title: learningSources.title,
      communityName: learningSources.communityName,
      lessonUrl: learningSources.lessonUrl,
      transcript: learningSources.transcript,
      homework: learningSources.homework,
      normalizedConcepts: learningSources.normalizedConcepts,
    })
    .from(learningSources)
    .where(and(eq(learningSources.userId, userId), eq(learningSources.enabled, true)))
    .orderBy(desc(learningSources.updatedAt))
    .limit(5);
  return {
    context: buildLearningContext(sources),
    sourceIds: sources.map(source => source.id),
  };
}

export async function saveRecommendationLearningSources(
  userId: number,
  recommendationId: number,
  sourceIds: number[],
) {
  if (!sourceIds.length) return;
  const db = await requireDb();
  const owned = await db
    .select({ id: learningSources.id, title: learningSources.title })
    .from(learningSources)
    .where(and(eq(learningSources.userId, userId), inArray(learningSources.id, sourceIds)));
  if (!owned.length) return;
  await db.insert(recommendationLearningSources).values(
    owned.map(source => ({
      userId,
      recommendationId,
      sourceId: source.id,
      citationReason: `Considered imported learning source: ${source.title}`,
      createdAt: Date.now(),
    })),
  );
}

export async function createSkootPack(
  userId: number,
  input: {
    group?: {
      platform: "skool" | "other";
      name: string;
      groupUrl: string;
      settingsUrl?: string;
      settingsLabel?: string;
    };
    title: string;
    triggerPhrases: string[];
    goal: string;
    notes?: string;
    steps: Array<{
      actionType: "asset_preparation" | "platform_setup" | "homework" | "engagement";
      actionTitle: string;
      rationale: string;
      assetDeliverable?: string;
      assetWidth?: number;
      assetHeight?: number;
      assetFormatHints?: string[];
      requiresConfirmation: boolean;
    }>;
  },
) {
  const db = await requireDb();
  const now = Date.now();
  return db.transaction(async tx => {
    let groupId: number | null = null;
    if (input.group) {
      const existing = (
        await tx
          .select({ id: groupContexts.id })
          .from(groupContexts)
          .where(and(eq(groupContexts.userId, userId), eq(groupContexts.groupUrl, input.group.groupUrl)))
          .limit(1)
      )[0];
      if (existing) {
        groupId = existing.id;
        await tx
          .update(groupContexts)
          .set({
            platform: input.group.platform,
            name: input.group.name,
            settingsUrl: input.group.settingsUrl || null,
            settingsLabel: input.group.settingsLabel || null,
            updatedAt: now,
          })
          .where(and(eq(groupContexts.id, existing.id), eq(groupContexts.userId, userId)));
      } else {
        const [createdGroup] = await tx
          .insert(groupContexts)
          .values({
            userId,
            platform: input.group.platform,
            name: input.group.name,
            groupUrl: input.group.groupUrl,
            settingsUrl: input.group.settingsUrl || null,
            settingsLabel: input.group.settingsLabel || null,
            createdAt: now,
            updatedAt: now,
          })
          .$returningId();
        groupId = createdGroup.id;
      }
    }
    const [pack] = await tx
      .insert(skootPacks)
      .values({
        userId,
        groupId,
        title: input.title,
        triggerPhrases: JSON.stringify(input.triggerPhrases),
        goal: input.goal,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();
    await tx.insert(skootPackSteps).values(
      input.steps.map((step, index) => ({
        userId,
        packId: pack.id,
        position: index + 1,
        actionType: step.actionType,
        actionTitle: step.actionTitle,
        rationale: step.rationale,
        assetDeliverable: step.assetDeliverable || null,
        assetWidth: step.assetWidth ?? null,
        assetHeight: step.assetHeight ?? null,
        assetFormatHints: step.assetFormatHints?.length ? JSON.stringify(step.assetFormatHints) : null,
        requiresConfirmation: step.requiresConfirmation,
        createdAt: now,
        updatedAt: now,
      })),
    );
    return pack.id;
  });
}

export async function getSkootPacks(userId: number) {
  const db = await requireDb();
  const packs = await db
    .select({ pack: skootPacks, group: groupContexts })
    .from(skootPacks)
    .leftJoin(groupContexts, eq(skootPacks.groupId, groupContexts.id))
    .where(and(eq(skootPacks.userId, userId), eq(skootPacks.enabled, true)))
    .orderBy(desc(skootPacks.updatedAt));
  const packIds = packs.map(row => row.pack.id);
  const steps = packIds.length
    ? await db
        .select()
        .from(skootPackSteps)
        .where(and(eq(skootPackSteps.userId, userId), inArray(skootPackSteps.packId, packIds)))
        .orderBy(skootPackSteps.position)
    : [];
  return packs.map(row => ({
    ...row.pack,
    triggerPhrases: JSON.parse(row.pack.triggerPhrases) as string[],
    group: row.group,
    steps: steps.filter(step => step.packId === row.pack.id),
  }));
}
