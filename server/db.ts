import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  dailyCheckins,
  businessActionOutcomes,
  businessActions,
  businessProfiles,
  breakdownNotes,
  contentSkoots,
  creatorPackAssignments,
  creatorPackAttributions,
  creatorPackDiagnosticAnswers,
  creatorPackKnowledge,
  creatorPackProposals,
  creatorPackVersions,
  creatorSkootPacks,
  experimentEvents,
  groupContexts,
  identifiableContentConsents,
  InsertUser,
  learningHomeworkItems,
  learningSourceAudit,
  learningSources,
  recommendations,
  recommendationLearningSources,
  skootPacks,
  skootPackSteps,
  skootConversationMessages,
  skootConversations,
  skootOutcomes,
  skoots,
  smartEscalations,
  supportNotifications,
  supportProfiles,
  userCredentials,
  users,
  validationFeedback,
} from "../drizzle/schema";
import type { ExperimentVersion } from "../shared/experiments";
import type { DailyCheckinInput, RecommendationOutput } from "../shared/skootly";
import { ENV } from "./_core/env";
import type { GeneratedBusinessAction } from "./actionEngine";
import { buildImmutableCreatorPackVersion, deriveNextPackDiagnosticQuestion, resolveActiveApprovedVersion, type CreatorKnowledgeType } from "./creatorPacks";
import { anonymizedContentSuggestion } from "./escalations";
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

export async function getCredentialByEmail(email: string) {
  const db = await requireDb();
  return (await db.select({ credential: userCredentials, user: users }).from(userCredentials).innerJoin(users, eq(userCredentials.userId, users.id)).where(eq(userCredentials.email, email)).limit(1))[0] ?? null;
}

export async function getCredentialForUser(userId: number) {
  const db = await requireDb();
  return (await db.select().from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1))[0] ?? null;
}

export async function createCredentialUser(input: { openId: string; name: string; email: string; passwordHash: string }) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [existingCredential, existingUser] = await Promise.all([
      tx.select({ id: userCredentials.id }).from(userCredentials).where(eq(userCredentials.email, input.email)).limit(1),
      tx.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1),
    ]);
    if (existingCredential[0] || existingUser[0]) throw new Error("EMAIL_IN_USE");
    const [created] = await tx.insert(users).values({ openId: input.openId, name: input.name, email: input.email, loginMethod: "password", role: "user", lastSignedIn: new Date() }).$returningId();
    await tx.insert(userCredentials).values({ userId: created.id, email: input.email, passwordHash: input.passwordHash });
    return (await tx.select().from(users).where(eq(users.id, created.id)).limit(1))[0];
  });
}

export async function setUserPasswordCredential(userId: number, email: string, passwordHash: string) {
  const db = await requireDb();
  const [credentialOwners, userOwners] = await Promise.all([
    db.select({ userId: userCredentials.userId }).from(userCredentials).where(eq(userCredentials.email, email)).limit(1),
    db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1),
  ]);
  if ((credentialOwners[0] && credentialOwners[0].userId !== userId) || (userOwners[0] && userOwners[0].id !== userId)) throw new Error("EMAIL_IN_USE");
  const existing = (await db.select({ id: userCredentials.id }).from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1))[0];
  if (existing) await db.update(userCredentials).set({ email, passwordHash }).where(and(eq(userCredentials.id, existing.id), eq(userCredentials.userId, userId)));
  else await db.insert(userCredentials).values({ userId, email, passwordHash });
  await db.update(users).set({ email }).where(eq(users.id, userId));
  return { success: true };
}

export async function touchUserSignIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
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
  const packAttribution = await getRecommendationCreatorPackAttribution(userId, latest.recommendation.id);

  return {
    mode: "recommendation" as const,
    checkin: latest.checkin,
    recommendation: {
      ...latest.recommendation,
      notTodayItems: JSON.parse(latest.recommendation.notTodayItems) as string[],
    },
    skoots: actions,
    learningCitations,
    packAttribution,
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

function decodeAction(action: typeof businessActions.$inferSelect) {
  return {
    ...action,
    relatedContactIds: action.relatedContactIds ? JSON.parse(action.relatedContactIds) as string[] : [],
    relatedContactUrls: action.relatedContactUrls ? JSON.parse(action.relatedContactUrls) as string[] : [],
  };
}

export async function getBusinessProfile(userId: number) {
  const db = await requireDb();
  return (await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1))[0] ?? null;
}

export async function upsertBusinessProfile(userId: number, input: {
  companyName: string; primaryGoal: string; monthlyRevenueGoal?: number; primaryOffer?: string; offerPrice?: number;
  primaryAcquisitionMethod?: string; importantNotes?: string; currentBottleneck?: string; defaultPlaybookId?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  const values = {
    companyName: input.companyName,
    primaryGoal: input.primaryGoal,
    monthlyRevenueGoal: input.monthlyRevenueGoal !== undefined ? String(input.monthlyRevenueGoal) : null,
    primaryOffer: input.primaryOffer || null,
    offerPrice: input.offerPrice !== undefined ? String(input.offerPrice) : null,
    primaryAcquisitionMethod: input.primaryAcquisitionMethod || null,
    importantNotes: input.importantNotes || null,
    currentBottleneck: input.currentBottleneck || null,
    defaultPlaybookId: input.defaultPlaybookId || "core_revenue_focus",
    updatedAt: now,
  };
  const existing = await getBusinessProfile(userId);
  if (existing) {
    await db.update(businessProfiles).set(values).where(and(eq(businessProfiles.id, existing.id), eq(businessProfiles.userId, userId)));
    return { ...existing, ...values };
  }
  const [created] = await db.insert(businessProfiles).values({ userId, ...values, createdAt: now }).$returningId();
  return (await db.select().from(businessProfiles).where(eq(businessProfiles.id, created.id)).limit(1))[0];
}

export async function getOpenBusinessActions(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(businessActions)
    .where(and(eq(businessActions.userId, userId), inArray(businessActions.status, ["recommended", "in_progress"])))
    .orderBy(desc(businessActions.priorityScore), desc(businessActions.createdAt)).limit(2);
  return rows.map(decodeAction);
}

export async function getBusinessActionById(userId: number, actionId: number) {
  const db = await requireDb();
  const action = (await db.select().from(businessActions).where(and(eq(businessActions.id, actionId), eq(businessActions.userId, userId))).limit(1))[0];
  if (!action) throw new Error("Action not found.");
  const outcomes = await db.select().from(businessActionOutcomes).where(and(eq(businessActionOutcomes.actionId, actionId), eq(businessActionOutcomes.userId, userId))).orderBy(desc(businessActionOutcomes.createdAt));
  return { action: decodeAction(action), outcomes };
}

export async function createBusinessActions(userId: number, businessProfileId: number, candidates: GeneratedBusinessAction[], playbookId?: string) {
  const db = await requireDb();
  const now = Date.now();
  if (!candidates.length) return [];
  const [profile] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(and(eq(businessProfiles.id, businessProfileId), eq(businessProfiles.userId, userId))).limit(1);
  if (!profile) throw new Error("Business profile not found.");
  await db.insert(businessActions).values(candidates.slice(0, 2).map(candidate => ({
    userId,
    businessProfileId,
    title: candidate.title,
    description: candidate.description,
    priorityScore: candidate.priorityScore,
    source: "highlevel" as const,
    signal: candidate.signal,
    recommendedAction: candidate.recommendedAction,
    estimatedValue: candidate.estimatedValue ? String(candidate.estimatedValue) : null,
    relatedContactIds: candidate.contactIds.length ? JSON.stringify(candidate.contactIds) : null,
    relatedContactUrls: candidate.contactUrls.length ? JSON.stringify(candidate.contactUrls) : null,
    playbookId: playbookId || null,
    createdAt: now,
  })));
  return getOpenBusinessActions(userId);
}

export async function updateBusinessActionStatus(userId: number, actionId: number, status: "recommended" | "in_progress" | "completed" | "dismissed") {
  const db = await requireDb();
  const current = (await db.select().from(businessActions).where(and(eq(businessActions.id, actionId), eq(businessActions.userId, userId))).limit(1))[0];
  if (!current) throw new Error("Action not found.");
  const allowed: Record<typeof current.status, readonly typeof current.status[]> = {
    recommended: ["recommended", "in_progress", "completed", "dismissed"],
    in_progress: ["in_progress", "completed", "dismissed"],
    completed: ["completed"],
    dismissed: ["dismissed"],
  };
  if (!allowed[current.status].includes(status)) throw new Error("This action cannot be moved back after it is closed.");
  const now = Date.now();
  await db.update(businessActions).set({ status, completedAt: status === "completed" ? now : current.completedAt, dismissedAt: status === "dismissed" ? now : current.dismissedAt }).where(and(eq(businessActions.id, actionId), eq(businessActions.userId, userId)));
  return { success: true, status };
}

export async function recordBusinessActionOutcome(userId: number, input: {
  actionId: number; contactsContacted: number; replies: number; bookings: number; purchases: number; outcomeValue?: number; notes?: string; learningNote?: string;
}) {
  const db = await requireDb();
  const action = (await db.select({ id: businessActions.id }).from(businessActions).where(and(eq(businessActions.id, input.actionId), eq(businessActions.userId, userId))).limit(1))[0];
  if (!action) throw new Error("Action not found.");
  const now = Date.now();
  await db.transaction(async tx => {
    await tx.insert(businessActionOutcomes).values({ userId, actionId: input.actionId, contactsContacted: input.contactsContacted, replies: input.replies, bookings: input.bookings, purchases: input.purchases, outcomeValue: input.outcomeValue !== undefined ? String(input.outcomeValue) : null, notes: input.notes || null, learningNote: input.learningNote || null, createdAt: now });
    await tx.update(businessActions).set({ status: "completed", completedAt: now }).where(and(eq(businessActions.id, input.actionId), eq(businessActions.userId, userId)));
  });
  return { success: true };
}

export async function getBusinessSnapshot(userId: number) {
  const db = await requireDb();
  const [profile, actions, wins] = await Promise.all([
    getBusinessProfile(userId),
    getOpenBusinessActions(userId),
    db.select().from(businessActionOutcomes).where(eq(businessActionOutcomes.userId, userId)).orderBy(desc(businessActionOutcomes.createdAt)).limit(3),
  ]);
  return { profile, actions, recentWins: wins };
}

export async function getCreatorPacks(creatorUserId: number) {
  const db = await requireDb();
  const packs = await db.select().from(creatorSkootPacks).where(eq(creatorSkootPacks.creatorUserId, creatorUserId)).orderBy(desc(creatorSkootPacks.updatedAt));
  const result = [] as Array<(typeof packs)[number] & { activeVersion: typeof creatorPackVersions.$inferSelect | null; assignments: Array<{ id: number; studentUserId: number; email: string | null; name: string | null }> }>;
  for (const pack of packs) {
    const activeVersion = pack.activeVersionId ? (await db.select().from(creatorPackVersions).where(eq(creatorPackVersions.id, pack.activeVersionId)).limit(1))[0] ?? null : null;
    const assignments = await db.select({ id: creatorPackAssignments.id, studentUserId: creatorPackAssignments.studentUserId, email: users.email, name: users.name }).from(creatorPackAssignments).innerJoin(users, eq(creatorPackAssignments.studentUserId, users.id)).where(and(eq(creatorPackAssignments.packId, pack.id), isNull(creatorPackAssignments.revokedAt)));
    result.push({ ...pack, activeVersion, assignments });
  }
  return result;
}

async function getOwnedCreatorPack(creatorUserId: number, packId: number) {
  const db = await requireDb();
  const pack = (await db.select().from(creatorSkootPacks).where(and(eq(creatorSkootPacks.id, packId), eq(creatorSkootPacks.creatorUserId, creatorUserId))).limit(1))[0];
  if (!pack) throw new Error("Creator Pack not found.");
  return pack;
}

export async function createCreatorPack(creatorUserId: number, input: { name: string; description?: string }) {
  const db = await requireDb();
  const now = Date.now();
  return db.transaction(async tx => {
    const [packId] = await tx.insert(creatorSkootPacks).values({ creatorUserId, name: input.name, description: input.description || null, createdAt: now, updatedAt: now }).$returningId();
    const [versionId] = await tx.insert(creatorPackVersions).values({ packId: packId.id, creatorUserId, versionNumber: 1, changeSummary: "Pack created", approvedAt: now }).$returningId();
    await tx.update(creatorSkootPacks).set({ activeVersionId: versionId.id, updatedAt: now }).where(eq(creatorSkootPacks.id, packId.id));
    return { packId: packId.id, versionId: versionId.id };
  });
}

export async function getCreatorPackProposals(creatorUserId: number, packId: number) {
  await getOwnedCreatorPack(creatorUserId, packId);
  const db = await requireDb();
  return db.select().from(creatorPackProposals).where(and(eq(creatorPackProposals.packId, packId), eq(creatorPackProposals.creatorUserId, creatorUserId), eq(creatorPackProposals.status, "pending"))).orderBy(desc(creatorPackProposals.createdAt));
}

export async function createCreatorPackProposal(creatorUserId: number, packId: number, sourceText: string, proposal: { proposedType: CreatorKnowledgeType; proposedContent: string }) {
  await getOwnedCreatorPack(creatorUserId, packId);
  const db = await requireDb();
  const [created] = await db.insert(creatorPackProposals).values({ packId, creatorUserId, sourceText, proposedType: proposal.proposedType, proposedContent: proposal.proposedContent, createdAt: Date.now() }).$returningId();
  return { proposalId: created.id, ...proposal };
}

export async function approveCreatorPackProposal(creatorUserId: number, input: { proposalId: number; content?: string; knowledgeType?: CreatorKnowledgeType }) {
  const db = await requireDb();
  const proposal = (await db.select().from(creatorPackProposals).where(and(eq(creatorPackProposals.id, input.proposalId), eq(creatorPackProposals.creatorUserId, creatorUserId), eq(creatorPackProposals.status, "pending"))).limit(1))[0];
  if (!proposal) throw new Error("Pending proposal not found.");
  const pack = await getOwnedCreatorPack(creatorUserId, proposal.packId);
  const now = Date.now();
  return db.transaction(async tx => {
    const latest = (await tx.select().from(creatorPackVersions).where(eq(creatorPackVersions.packId, pack.id)).orderBy(desc(creatorPackVersions.versionNumber)).limit(1))[0];
    const existingKnowledge = pack.activeVersionId ? await tx.select().from(creatorPackKnowledge).where(eq(creatorPackKnowledge.versionId, pack.activeVersionId)) : [];
    const snapshot = buildImmutableCreatorPackVersion(latest?.versionNumber ?? 0, existingKnowledge.map(item => ({ knowledgeType: item.knowledgeType, content: item.content, sourceText: item.sourceText })), { knowledgeType: input.knowledgeType || proposal.proposedType, content: input.content || proposal.proposedContent, sourceText: proposal.sourceText });
    const [version] = await tx.insert(creatorPackVersions).values({ packId: pack.id, creatorUserId, versionNumber: snapshot.versionNumber, changeSummary: snapshot.addition.content, approvedAt: now }).$returningId();
    if (snapshot.carriedKnowledge.length) await tx.insert(creatorPackKnowledge).values(snapshot.carriedKnowledge.map(item => ({ packId: pack.id, versionId: version.id, creatorUserId, ...item, createdAt: now })));
    await tx.insert(creatorPackKnowledge).values({ packId: pack.id, versionId: version.id, creatorUserId, ...snapshot.addition, createdAt: now });
    await tx.update(creatorSkootPacks).set({ activeVersionId: version.id, updatedAt: now }).where(and(eq(creatorSkootPacks.id, pack.id), eq(creatorSkootPacks.creatorUserId, creatorUserId)));
    await tx.update(creatorPackProposals).set({ status: "approved", resolvedAt: now }).where(and(eq(creatorPackProposals.id, proposal.id), eq(creatorPackProposals.creatorUserId, creatorUserId)));
    return { versionId: version.id, versionNumber: snapshot.versionNumber };
  });
}

export async function cancelCreatorPackProposal(creatorUserId: number, proposalId: number) {
  const db = await requireDb();
  const result = await db.update(creatorPackProposals).set({ status: "cancelled", resolvedAt: Date.now() }).where(and(eq(creatorPackProposals.id, proposalId), eq(creatorPackProposals.creatorUserId, creatorUserId), eq(creatorPackProposals.status, "pending")));
  if (!result[0]?.affectedRows) throw new Error("Pending proposal not found.");
  return { success: true };
}

export async function assignCreatorPackStudent(creatorUserId: number, packId: number, studentEmail: string) {
  await getOwnedCreatorPack(creatorUserId, packId);
  const db = await requireDb();
  const student = (await db.select().from(users).where(eq(users.email, studentEmail.trim().toLowerCase())).limit(1))[0];
  if (!student) throw new Error("No Skootly user with that email exists yet.");
  if (student.loginMethod === "password") throw new Error("This email-password account must verify its email before it can receive a Creator Pack assignment.");
  if (student.id === creatorUserId) throw new Error("Assign this pack to a student, not yourself.");
  const now = Date.now();
  const existing = (await db.select().from(creatorPackAssignments).where(and(eq(creatorPackAssignments.packId, packId), eq(creatorPackAssignments.studentUserId, student.id))).limit(1))[0];
  if (existing) await db.update(creatorPackAssignments).set({ revokedAt: null, assignedAt: now }).where(eq(creatorPackAssignments.id, existing.id));
  else await db.insert(creatorPackAssignments).values({ packId, creatorUserId, studentUserId: student.id, assignedAt: now });
  return { student: { id: student.id, email: student.email, name: student.name } };
}

export async function getAssignedCreatorPackContext(studentUserId: number) {
  const db = await requireDb();
  const assignment = (await db.select({ packId: creatorPackAssignments.packId, creatorUserId: creatorPackAssignments.creatorUserId, packName: creatorSkootPacks.name, packDescription: creatorSkootPacks.description, activeVersionId: creatorSkootPacks.activeVersionId, creatorName: users.name }).from(creatorPackAssignments).innerJoin(creatorSkootPacks, eq(creatorPackAssignments.packId, creatorSkootPacks.id)).innerJoin(users, eq(creatorPackAssignments.creatorUserId, users.id)).where(and(eq(creatorPackAssignments.studentUserId, studentUserId), isNull(creatorPackAssignments.revokedAt))).limit(1))[0];
  if (!assignment?.activeVersionId) return null;
  const version = resolveActiveApprovedVersion(assignment.activeVersionId, await db.select().from(creatorPackVersions).where(and(eq(creatorPackVersions.id, assignment.activeVersionId), eq(creatorPackVersions.packId, assignment.packId))).limit(1));
  if (!version) return null;
  const knowledge = await db.select().from(creatorPackKnowledge).where(and(eq(creatorPackKnowledge.packId, assignment.packId), eq(creatorPackKnowledge.versionId, version.id), eq(creatorPackKnowledge.creatorUserId, assignment.creatorUserId))).orderBy(creatorPackKnowledge.id);
  return { ...assignment, version, knowledge };
}

export async function saveCreatorPackRecommendationAttribution(studentUserId: number, recommendationId: number) {
  const assigned = await getAssignedCreatorPackContext(studentUserId);
  if (!assigned) return null;
  const appliedKnowledge = assigned.knowledge.find(item => item.knowledgeType === "decision_rule")
    ?? assigned.knowledge.find(item => item.knowledgeType === "diagnostic_rule")
    ?? assigned.knowledge[0]
    ?? null;
  const db = await requireDb();
  await db.insert(creatorPackAttributions).values({
    creatorUserId: assigned.creatorUserId,
    studentUserId,
    packId: assigned.packId,
    packVersionId: assigned.version.id,
    knowledgeId: appliedKnowledge?.id ?? null,
    recommendationId,
    createdAt: Date.now(),
  });
  return { packId: assigned.packId, versionId: assigned.version.id };
}

export async function getRecommendationCreatorPackAttribution(studentUserId: number, recommendationId: number) {
  const db = await requireDb();
  return (await db
    .select({
      packName: creatorSkootPacks.name,
      creatorName: users.name,
      versionNumber: creatorPackVersions.versionNumber,
      updatedAt: creatorPackVersions.approvedAt,
      appliedRule: creatorPackKnowledge.content,
    })
    .from(creatorPackAttributions)
    .innerJoin(creatorSkootPacks, eq(creatorPackAttributions.packId, creatorSkootPacks.id))
    .innerJoin(creatorPackVersions, eq(creatorPackAttributions.packVersionId, creatorPackVersions.id))
    .innerJoin(users, eq(creatorPackAttributions.creatorUserId, users.id))
    .leftJoin(creatorPackKnowledge, eq(creatorPackAttributions.knowledgeId, creatorPackKnowledge.id))
    .where(and(
      eq(creatorPackAttributions.studentUserId, studentUserId),
      eq(creatorPackAttributions.recommendationId, recommendationId),
    ))
    .limit(1))[0] ?? null;
}

export async function getMyPackJourney(studentUserId: number) {
  const assigned = await getAssignedCreatorPackContext(studentUserId);
  if (!assigned) return null;
  const db = await requireDb();
  const answers = await db.select().from(creatorPackDiagnosticAnswers).where(and(eq(creatorPackDiagnosticAnswers.packId, assigned.packId), eq(creatorPackDiagnosticAnswers.studentUserId, studentUserId))).orderBy(creatorPackDiagnosticAnswers.updatedAt);
  const question = deriveNextPackDiagnosticQuestion(assigned.knowledge, answers.map(item => item.questionKey));
  const milestones = assigned.knowledge.filter(item => item.knowledgeType === "milestone");
  const currentMilestone = Math.min(answers.length + 1, Math.max(milestones.length, 1));
  return {
    destination: assigned.packDescription || assigned.packName,
    creatorName: assigned.creatorName || "Your creator",
    packName: assigned.packName,
    packId: assigned.packId,
    versionNumber: assigned.version.versionNumber,
    updatedAt: assigned.version.approvedAt,
    currentMilestone,
    milestoneCount: Math.max(milestones.length, 1),
    answers,
    nextQuestion: question,
  };
}

export async function saveMyPackDiagnosticAnswer(studentUserId: number, input: { questionKey: string; questionText: string; answer: string }) {
  const assigned = await getAssignedCreatorPackContext(studentUserId);
  if (!assigned) throw new Error("No active Creator Pack is assigned.");
  const validQuestion = deriveNextPackDiagnosticQuestion(assigned.knowledge, []);
  if (!validQuestion || validQuestion.key !== input.questionKey || validQuestion.text !== input.questionText) throw new Error("This Pack question is no longer current.");
  const db = await requireDb(); const now = Date.now();
  const existing = (await db.select({ id: creatorPackDiagnosticAnswers.id }).from(creatorPackDiagnosticAnswers).where(and(eq(creatorPackDiagnosticAnswers.packId, assigned.packId), eq(creatorPackDiagnosticAnswers.studentUserId, studentUserId), eq(creatorPackDiagnosticAnswers.questionKey, input.questionKey))).limit(1))[0];
  if (existing) await db.update(creatorPackDiagnosticAnswers).set({ answer: input.answer, source: "student", updatedAt: now }).where(and(eq(creatorPackDiagnosticAnswers.id, existing.id), eq(creatorPackDiagnosticAnswers.studentUserId, studentUserId)));
  else await db.insert(creatorPackDiagnosticAnswers).values({ packId: assigned.packId, creatorUserId: assigned.creatorUserId, studentUserId, questionKey: input.questionKey, questionText: input.questionText, answer: input.answer, source: "student", createdAt: now, updatedAt: now });
  return getMyPackJourney(studentUserId);
}

export async function getCreatorPackInsights(creatorUserId: number) {
  const db = await requireDb();
  const assignments = await db.select({ studentUserId: creatorPackAssignments.studentUserId }).from(creatorPackAssignments).where(and(eq(creatorPackAssignments.creatorUserId, creatorUserId), isNull(creatorPackAssignments.revokedAt)));
  const studentIds = assignments.map(item => item.studentUserId).filter((id, index, values) => values.indexOf(id) === index);
  if (!studentIds.length) return { assignedStudents: 0, bottlenecks: [], repeatedQuestions: [], misconceptions: [], skippedSkoots: [], escalationRequests: [], outcomeSummary: [], recentOutcomes: [] };
  const [checkins, questions, diagnosticAnswers, skipped, escalations, outcomes] = await Promise.all([
    db.select({ blocker: dailyCheckins.blocker }).from(dailyCheckins).where(inArray(dailyCheckins.userId, studentIds)).orderBy(desc(dailyCheckins.createdAt)).limit(100),
    db.select({ content: skootConversationMessages.content }).from(skootConversationMessages).where(and(inArray(skootConversationMessages.userId, studentIds), eq(skootConversationMessages.role, "user"))).orderBy(desc(skootConversationMessages.createdAt)).limit(100),
    db.select({ answer: creatorPackDiagnosticAnswers.answer }).from(creatorPackDiagnosticAnswers).where(and(eq(creatorPackDiagnosticAnswers.creatorUserId, creatorUserId), inArray(creatorPackDiagnosticAnswers.studentUserId, studentIds))).orderBy(desc(creatorPackDiagnosticAnswers.createdAt)).limit(100),
    db.select({ title: skoots.title }).from(skoots).where(and(inArray(skoots.userId, studentIds), eq(skoots.status, "skipped"))).orderBy(desc(skoots.createdAt)).limit(100),
    db.select({ reason: smartEscalations.routingReason }).from(smartEscalations).where(and(eq(smartEscalations.creatorUserId, creatorUserId), inArray(smartEscalations.studentUserId, studentIds))).orderBy(desc(smartEscalations.createdAt)).limit(100),
    db.select({ outcomeType: skootOutcomes.outcomeType, revenueAmount: skootOutcomes.revenueAmount }).from(skootOutcomes).where(inArray(skootOutcomes.userId, studentIds)).orderBy(desc(skootOutcomes.createdAt)).limit(20),
  ]);
  const top = <T extends { [key: string]: unknown }>(items: T[], key: keyof T) => Object.entries(items.reduce<Record<string, number>>((acc, item) => { const value = String(item[key] ?? "").trim(); if (value) acc[value] = (acc[value] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => ({ label, count }));
  const classify = (value: string) => {
    const text = value.toLowerCase();
    if (/\b(price|pricing|charge|cost)\b/.test(text)) return "Pricing and offer confidence";
    if (/\b(lead|prospect|audience|traffic)\b/.test(text)) return "Finding the right prospects";
    if (/\b(call|book|sales|close|follow.?up)\b/.test(text)) return "Sales conversations and follow-up";
    if (/\b(content|post|video|webinar|challenge)\b/.test(text)) return "Content and campaign execution";
    if (/\b(tech|tool|setup|integrat|automat)\b/.test(text)) return "Tool and setup friction";
    return "Clarifying the next move";
  };
  const categorizedQuestions = questions.map(item => ({ label: classify(item.content) }));
  const categorizedMisconceptions = diagnosticAnswers.filter(item => /\b(can't|cannot|not ready|need more|before i|first have to|don't know)\b/i.test(item.answer)).map(item => ({ label: classify(item.answer) }));
  const outcomeSummary = top(outcomes, "outcomeType");
  return { assignedStudents: studentIds.length, bottlenecks: top(checkins, "blocker"), repeatedQuestions: top(categorizedQuestions, "label"), misconceptions: top(categorizedMisconceptions, "label"), skippedSkoots: top(skipped, "title"), escalationRequests: top(escalations, "reason"), outcomeSummary, recentOutcomes: outcomes };
}

export async function createConversation(userId: number, title?: string) {
  const db = await requireDb();
  const now = Date.now();
  const [created] = await db
    .insert(skootConversations)
    .values({
      userId,
      title: title?.trim().slice(0, 300) || "Private Skoot conversation",
      consentedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .$returningId();
  return created.id;
}

export async function getLatestConversation(userId: number) {
  const db = await requireDb();
  const conversation = (
    await db
      .select()
      .from(skootConversations)
      .where(
        and(
          eq(skootConversations.userId, userId),
          isNull(skootConversations.deletedAt),
          isNull(skootConversations.consentRevokedAt),
        ),
      )
      .orderBy(desc(skootConversations.updatedAt))
      .limit(1)
  )[0];
  if (!conversation) return null;
  const messages = await db
    .select()
    .from(skootConversationMessages)
    .where(
      and(
        eq(skootConversationMessages.userId, userId),
        eq(skootConversationMessages.conversationId, conversation.id),
      ),
    )
    .orderBy(skootConversationMessages.createdAt)
    .limit(40);
  return { conversation, messages };
}

export async function appendConversationMessage(
  userId: number,
  conversationId: number,
  role: "user" | "skoot",
  content: string,
  citations?: Array<{ title: string; lessonUrl: string | null }>,
) {
  const db = await requireDb();
  const active = (
    await db
      .select({ id: skootConversations.id })
      .from(skootConversations)
      .where(
        and(
          eq(skootConversations.id, conversationId),
          eq(skootConversations.userId, userId),
          isNull(skootConversations.deletedAt),
          isNull(skootConversations.consentRevokedAt),
        ),
      )
      .limit(1)
  )[0];
  if (!active) throw new Error("Private conversation not found or consent has been revoked.");
  const now = Date.now();
  await db.transaction(async tx => {
    await tx.insert(skootConversationMessages).values({
      conversationId,
      userId,
      role,
      content: content.slice(0, 6000),
      citations: citations?.length ? JSON.stringify(citations) : null,
      createdAt: now,
    });
    await tx
      .update(skootConversations)
      .set({ updatedAt: now })
      .where(and(eq(skootConversations.id, conversationId), eq(skootConversations.userId, userId)));
  });
}

export async function deleteConversation(userId: number, conversationId: number) {
  const db = await requireDb();
  const result = await db
    .delete(skootConversations)
    .where(and(eq(skootConversations.id, conversationId), eq(skootConversations.userId, userId)));
  if (!result[0]?.affectedRows) throw new Error("Private conversation not found.");
}

export async function getConversationGrounding(userId: number) {
  const db = await requireDb();
  const activeSkoots = await db
    .select({ title: skoots.title, reasoning: skoots.reasoning })
    .from(skoots)
    .where(and(eq(skoots.userId, userId), eq(skoots.status, "active")))
    .orderBy(desc(skoots.createdAt))
    .limit(2);
  const learning = await getEnabledLearningContextWithSources(userId);
  const sources = await db
    .select({ title: learningSources.title, lessonUrl: learningSources.lessonUrl })
    .from(learningSources)
    .where(and(eq(learningSources.userId, userId), eq(learningSources.enabled, true)))
    .orderBy(desc(learningSources.updatedAt))
    .limit(5);
  const business = await getBusinessSnapshot(userId);
  return {
    activeSkoots,
    learningContext: learning.context,
    sources,
    businessMemory: business.profile
      ? {
          companyName: business.profile.companyName,
          primaryGoal: business.profile.primaryGoal,
          currentBottleneck: business.profile.currentBottleneck,
          primaryOffer: business.profile.primaryOffer,
          actions: business.actions.map(action => ({ title: action.title, reasoning: action.signal, status: action.status })),
          recentWins: business.recentWins.map(outcome => ({ bookings: outcome.bookings, purchases: outcome.purchases, outcomeValue: outcome.outcomeValue })),
        }
      : null,
  };
}

export async function getSupportProfiles(creatorUserId: number) {
  const db = await requireDb();
  return db.select().from(supportProfiles).where(eq(supportProfiles.creatorUserId, creatorUserId)).orderBy(supportProfiles.routingLevel);
}

export async function saveSupportProfile(creatorUserId: number, input: { id?: number; routingLevel: "csm" | "coach"; displayName: string; bookingUrl: string | null; assigneeEmail?: string; active?: boolean }) {
  const db = await requireDb();
  const now = Date.now();
  let userId: number | null = null;
  if (input.assigneeEmail?.trim()) {
    const assignee = (await db.select({ id: users.id }).from(users).where(eq(users.email, input.assigneeEmail.trim().toLowerCase())).limit(1))[0];
    if (!assignee) throw new Error("That support person needs a Skootly account before they can receive private breakdowns.");
    const verifiedAssignee = (await db.select({ id: users.id, loginMethod: users.loginMethod }).from(users).where(eq(users.id, assignee.id)).limit(1))[0];
    if (verifiedAssignee?.loginMethod === "password") throw new Error("That support person's email must be verified before private breakdowns can be assigned.");
    userId = assignee.id;
  }
  if (input.id) {
    const result = await db.update(supportProfiles).set({ userId, routingLevel: input.routingLevel, displayName: input.displayName, bookingUrl: input.bookingUrl, active: input.active ?? true, updatedAt: now }).where(and(eq(supportProfiles.id, input.id), eq(supportProfiles.creatorUserId, creatorUserId)));
    if (!result[0]?.affectedRows) throw new Error("Support profile not found.");
    return { id: input.id };
  }
  const [created] = await db.insert(supportProfiles).values({ creatorUserId, userId, routingLevel: input.routingLevel, displayName: input.displayName, bookingUrl: input.bookingUrl, active: input.active ?? true, createdAt: now, updatedAt: now }).$returningId();
  return { id: created.id };
}

export async function getStudentEscalationRoute(studentUserId: number, relatedSkootId?: number) {
  const assigned = await getAssignedCreatorPackContext(studentUserId);
  if (!assigned) return null;
  const db = await requireDb();
  const profiles = await db.select().from(supportProfiles).where(and(eq(supportProfiles.creatorUserId, assigned.creatorUserId), eq(supportProfiles.active, true)));
  const prior = relatedSkootId ? await db.select({ id: skoots.id }).from(skoots).where(and(eq(skoots.userId, studentUserId), eq(skoots.id, relatedSkootId), inArray(skoots.status, ["completed", "skipped"]))) : [];
  return { creatorUserId: assigned.creatorUserId, packId: assigned.packId, hasRelevantPackRule: assigned.knowledge.length > 0, repeatedAttempts: prior.length, csm: profiles.find(profile => profile.routingLevel === "csm") ?? null, coach: profiles.find(profile => profile.routingLevel === "coach") ?? null };
}

export async function createSmartEscalation(input: { creatorUserId: number; studentUserId: number; supportProfileId: number | null; relatedSkootId: number | null; relatedRecommendationId: number | null; packId: number | null; escalationType: "csm" | "coach"; routingReason: string; bookingUrl: string | null }) {
  const db = await requireDb();
  const [created] = await db.insert(smartEscalations).values({ ...input, createdAt: Date.now() }).$returningId();
  const assigned = input.supportProfileId
    ? (await db.select({ userId: supportProfiles.userId }).from(supportProfiles).where(and(eq(supportProfiles.id, input.supportProfileId), eq(supportProfiles.creatorUserId, input.creatorUserId))).limit(1))[0]
    : null;
  const recipients = [input.creatorUserId, assigned?.userId].filter((value, index, values): value is number => Boolean(value) && values.indexOf(value) === index);
  if (recipients.length) await db.insert(supportNotifications).values(recipients.map(recipientUserId => ({ creatorUserId: input.creatorUserId, recipientUserId, escalationId: created.id, title: "New private breakdown request", body: `A student requested ${input.escalationType === "csm" ? "CSM" : "coach"} support.`, deepLink: `/creator?escalation=${created.id}`, createdAt: Date.now() })));
  return { mode: "escalation" as const, escalationId: created.id, escalationType: input.escalationType, routingReason: input.routingReason, bookingUrl: input.bookingUrl };
}

export async function getSupportNotifications(recipientUserId: number) {
  const db = await requireDb();
  return db.select().from(supportNotifications).where(and(eq(supportNotifications.recipientUserId, recipientUserId), isNull(supportNotifications.dismissedAt))).orderBy(desc(supportNotifications.createdAt)).limit(20);
}

export async function updateSupportNotification(recipientUserId: number, notificationId: number, action: "read" | "dismiss") {
  const db = await requireDb();
  const result = await db.update(supportNotifications).set(action === "read" ? { readAt: Date.now() } : { dismissedAt: Date.now() }).where(and(eq(supportNotifications.id, notificationId), eq(supportNotifications.recipientUserId, recipientUserId)));
  if (!result[0]?.affectedRows) throw new Error("Private support notification not found.");
  return { success: true };
}

export async function grantIdentifiableContentConsent(studentUserId: number, input: { creatorUserId: number; scope: "name" | "result" | "recording" | "screenshot" | "business_info"; purpose: string }) {
  const db = await requireDb();
  const assignment = (await db.select({ id: creatorPackAssignments.id }).from(creatorPackAssignments).where(and(eq(creatorPackAssignments.creatorUserId, input.creatorUserId), eq(creatorPackAssignments.studentUserId, studentUserId), isNull(creatorPackAssignments.revokedAt))).limit(1))[0];
  if (!assignment) throw new Error("Consent can only be granted to your currently assigned Creator Pack owner.");
  const now = Date.now();
  await db.insert(identifiableContentConsents).values({ creatorUserId: input.creatorUserId, studentUserId, scope: input.scope, purpose: input.purpose.slice(0, 1000), consentedAt: now, createdAt: now }).onDuplicateKeyUpdate({ set: { purpose: input.purpose.slice(0, 1000), consentedAt: now, revokedAt: null } });
  return { success: true };
}

export async function revokeIdentifiableContentConsent(studentUserId: number, input: { creatorUserId: number; scope: "name" | "result" | "recording" | "screenshot" | "business_info" }) {
  const db = await requireDb();
  await db.update(identifiableContentConsents).set({ revokedAt: Date.now() }).where(and(eq(identifiableContentConsents.creatorUserId, input.creatorUserId), eq(identifiableContentConsents.studentUserId, studentUserId), eq(identifiableContentConsents.scope, input.scope)));
  return { success: true };
}

export async function getStudentEscalations(studentUserId: number) {
  const db = await requireDb();
  return db.select({ escalation: smartEscalations, helperName: supportProfiles.displayName }).from(smartEscalations).leftJoin(supportProfiles, eq(smartEscalations.supportProfileId, supportProfiles.id)).where(eq(smartEscalations.studentUserId, studentUserId)).orderBy(desc(smartEscalations.createdAt));
}

export async function getCreatorEscalations(actorUserId: number) {
  const db = await requireDb();
  return db.select({ escalation: smartEscalations, studentName: users.name, studentEmail: users.email, helperName: supportProfiles.displayName }).from(smartEscalations).innerJoin(users, eq(smartEscalations.studentUserId, users.id)).leftJoin(supportProfiles, eq(smartEscalations.supportProfileId, supportProfiles.id)).where(or(eq(smartEscalations.creatorUserId, actorUserId), eq(supportProfiles.userId, actorUserId))).orderBy(desc(smartEscalations.createdAt));
}

export async function updateEscalationStatus(input: { actorUserId: number; escalationId: number; allowed: "student" | "creator"; status: "booked" | "completed" }) {
  const db = await requireDb();
  const ownership = input.allowed === "student"
    ? eq(smartEscalations.studentUserId, input.actorUserId)
    : or(eq(smartEscalations.creatorUserId, input.actorUserId), inArray(smartEscalations.supportProfileId, db.select({ id: supportProfiles.id }).from(supportProfiles).where(eq(supportProfiles.userId, input.actorUserId))));
  const result = await db.update(smartEscalations).set({ status: input.status, resolvedAt: input.status === "completed" ? Date.now() : null }).where(and(eq(smartEscalations.id, input.escalationId), ownership));
  if (!result[0]?.affectedRows) throw new Error("Private escalation not found.");
  return { success: true };
}

export async function getEscalationBrief(actorUserId: number, escalationId: number) {
  const db = await requireDb();
  const escalation = (await db.select({ escalation: smartEscalations }).from(smartEscalations).leftJoin(supportProfiles, eq(smartEscalations.supportProfileId, supportProfiles.id)).where(and(eq(smartEscalations.id, escalationId), or(eq(smartEscalations.creatorUserId, actorUserId), eq(supportProfiles.userId, actorUserId)))).limit(1))[0]?.escalation;
  if (!escalation) throw new Error("Private breakdown not found.");
  const [checkins, actions, outcomes, pack] = await Promise.all([
    db.select().from(dailyCheckins).where(eq(dailyCheckins.userId, escalation.studentUserId)).orderBy(desc(dailyCheckins.createdAt)).limit(1),
    db.select().from(skoots).where(eq(skoots.userId, escalation.studentUserId)).orderBy(desc(skoots.createdAt)).limit(6),
    db.select().from(skootOutcomes).where(eq(skootOutcomes.userId, escalation.studentUserId)).orderBy(desc(skootOutcomes.createdAt)).limit(6),
    escalation.packId ? getOwnedCreatorPack(escalation.creatorUserId, escalation.packId) : Promise.resolve(null),
  ]);
  const knowledge = pack?.activeVersionId ? await db.select({ content: creatorPackKnowledge.content, knowledgeType: creatorPackKnowledge.knowledgeType }).from(creatorPackKnowledge).where(and(eq(creatorPackKnowledge.packId, pack.id), eq(creatorPackKnowledge.versionId, pack.activeVersionId))).limit(8) : [];
  return { escalation, checkin: checkins[0] ?? null, actions, outcomes, knowledge, recommendedFocus: `Clarify the root constraint behind: ${checkins[0]?.blocker ?? escalation.routingReason}` };
}

export async function createBreakdownNote(actorUserId: number, input: { escalationId: number; notes: string; clientNextAction?: string; proposedKnowledgeType?: CreatorKnowledgeType; proposedKnowledgeContent?: string }) {
  const brief = await getEscalationBrief(actorUserId, input.escalationId);
  const db = await requireDb();
  const creatorUserId = brief.escalation.creatorUserId;
  const [created] = await db.insert(breakdownNotes).values({ escalationId: input.escalationId, creatorUserId, authorUserId: actorUserId, notes: input.notes, clientNextAction: input.clientNextAction || null, proposedKnowledgeType: input.proposedKnowledgeType || null, proposedKnowledgeContent: input.proposedKnowledgeContent || null, createdAt: Date.now() }).$returningId();
  let proposalId: number | null = null;
  if (brief.escalation.packId && input.proposedKnowledgeType && input.proposedKnowledgeContent?.trim()) {
    const [proposal] = await db.insert(creatorPackProposals).values({
      packId: brief.escalation.packId,
      creatorUserId,
      sourceText: `Private breakdown learning (review required): ${input.notes.trim().slice(0, 2000)}`,
      proposedType: input.proposedKnowledgeType,
      proposedContent: input.proposedKnowledgeContent.trim(),
      status: "pending",
      createdAt: Date.now(),
    }).$returningId();
    proposalId = proposal.id;
  }
  return { noteId: created.id, proposalId, packId: brief.escalation.packId, studentUserId: brief.escalation.studentUserId };
}

export async function createContentSkootSuggestions(creatorUserId: number) {
  const db = await requireDb();
  const assignments = await db.select({ studentUserId: creatorPackAssignments.studentUserId }).from(creatorPackAssignments).where(and(eq(creatorPackAssignments.creatorUserId, creatorUserId), isNull(creatorPackAssignments.revokedAt)));
  const ids = assignments.map(item => item.studentUserId).filter((id, index, all) => all.indexOf(id) === index);
  if (!ids.length) return [];
  const [checkins, skipped, escalations] = await Promise.all([
    db.select({ label: dailyCheckins.blocker }).from(dailyCheckins).where(inArray(dailyCheckins.userId, ids)).orderBy(desc(dailyCheckins.createdAt)).limit(100),
    db.select({ label: skoots.title }).from(skoots).where(and(inArray(skoots.userId, ids), eq(skoots.status, "skipped"))).orderBy(desc(skoots.createdAt)).limit(100),
    db.select({ label: smartEscalations.routingReason }).from(smartEscalations).where(and(eq(smartEscalations.creatorUserId, creatorUserId), inArray(smartEscalations.studentUserId, ids))).orderBy(desc(smartEscalations.createdAt)).limit(100),
  ]);
  const counts = [...checkins, ...skipped, ...escalations].reduce<Record<string, number>>((memo, item) => { const label = item.label.trim(); if (label) memo[label] = (memo[label] ?? 0) + 1; return memo; }, {});
  const suggestions = Object.entries(counts).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([bottleneckLabel, count]) => ({ bottleneckLabel, ...anonymizedContentSuggestion(bottleneckLabel, count) }));
  for (const suggestion of suggestions) {
    const existing = await db.select({ id: contentSkoots.id }).from(contentSkoots).where(and(eq(contentSkoots.creatorUserId, creatorUserId), eq(contentSkoots.bottleneckLabel, suggestion.bottleneckLabel), eq(contentSkoots.status, "suggested"))).limit(1);
    if (!existing.length) await db.insert(contentSkoots).values({ creatorUserId, bottleneckLabel: suggestion.safePattern, occurrenceCount: suggestion.occurrenceCount, title: suggestion.title, format: suggestion.format, outline: suggestion.outline, createdAt: Date.now() });
  }
  return suggestions;
}
