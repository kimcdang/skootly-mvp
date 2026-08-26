import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const dailyCheckins = mysqlTable(
  "daily_checkins",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experimentVersion: mysqlEnum("experimentVersion", [
      "founder",
      "coach",
      "client_success",
    ]).notNull(),
    goal: text("goal").notNull(),
    currentState: text("currentState").notNull(),
    blocker: text("blocker").notNull(),
    availableTime: mysqlEnum("availableTime", [
      "15_minutes",
      "30_minutes",
      "60_minutes",
      "90_plus_minutes",
    ]).notNull(),
    energyLevel: mysqlEnum("energyLevel", ["low", "steady", "high"]).notNull(),
    metricName: varchar("metricName", { length: 160 }),
    currentValue: varchar("currentValue", { length: 120 }),
    targetValue: varchar("targetValue", { length: 120 }),
    opportunities: text("opportunities"),
    constraints: text("constraints"),
    optionalContext: text("optionalContext"),
    status: mysqlEnum("status", ["pending", "recommended", "needs_clarification"])
      .default("pending")
      .notNull(),
    clarificationQuestion: text("clarificationQuestion"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("daily_checkins_user_created_idx").on(table.userId, table.createdAt),
    index("daily_checkins_experiment_idx").on(table.experimentVersion),
  ],
);

export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkinId: int("checkinId")
      .notNull()
      .references(() => dailyCheckins.id, { onDelete: "cascade" }),
    experimentVersion: mysqlEnum("experimentVersion", [
      "founder",
      "coach",
      "client_success",
    ]).notNull(),
    goalSummary: text("goalSummary").notNull(),
    bottleneck: text("bottleneck").notNull(),
    rationale: text("rationale").notNull(),
    notTodayReason: text("notTodayReason").notNull(),
    notTodayItems: text("notTodayItems").notNull(),
    modelId: varchar("modelId", { length: 120 }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("recommendations_user_created_idx").on(table.userId, table.createdAt),
    index("recommendations_checkin_idx").on(table.checkinId),
  ],
);

export const skoots = mysqlTable(
  "skoots",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkinId: int("checkinId")
      .notNull()
      .references(() => dailyCheckins.id, { onDelete: "cascade" }),
    recommendationId: int("recommendationId")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    experimentVersion: mysqlEnum("experimentVersion", [
      "founder",
      "coach",
      "client_success",
    ]).notNull(),
    title: text("title").notNull(),
    reasoning: text("reasoning").notNull(),
    estimatedImpact: mysqlEnum("estimatedImpact", ["low", "medium", "high"]).notNull(),
    position: int("position").notNull(),
    status: mysqlEnum("status", ["active", "completed", "skipped"])
      .default("active")
      .notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    completedAt: bigint("completedAt", { mode: "number" }),
  },
  table => [
    index("skoots_user_status_idx").on(table.userId, table.status),
    index("skoots_recommendation_idx").on(table.recommendationId),
  ],
);

export const skootOutcomes = mysqlTable(
  "skoot_outcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skootId: int("skootId")
      .notNull()
      .references(() => skoots.id, { onDelete: "cascade" }),
    outcomeType: mysqlEnum("outcomeType", [
      "no_result_yet",
      "made_progress",
      "completed_milestone",
      "received_reply",
      "booked_call",
      "generated_revenue",
      "retained_client",
      "other",
    ]).notNull(),
    measurableOutcome: text("measurableOutcome"),
    revenueAmount: decimal("revenueAmount", { precision: 14, scale: 2 }),
    notes: text("notes"),
    userFeedback: text("userFeedback"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("skoot_outcomes_user_created_idx").on(table.userId, table.createdAt)],
);

export const validationFeedback = mysqlTable(
  "validation_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experimentVersion: mysqlEnum("experimentVersion", [
      "founder",
      "coach",
      "client_success",
    ]).notNull(),
    participantName: varchar("participantName", { length: 200 }).notNull(),
    perceivedPurpose: text("perceivedPurpose").notNull(),
    wouldUse: mysqlEnum("wouldUse", ["definitely", "maybe", "no"]).notNull(),
    wouldPay: mysqlEnum("wouldPay", ["yes", "maybe", "no"]).notNull(),
    suggestedMonthlyPrice: decimal("suggestedMonthlyPrice", { precision: 10, scale: 2 }),
    mostInterestingFeature: text("mostInterestingFeature"),
    confusion: text("confusion"),
    notes: text("notes"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("validation_feedback_user_experiment_idx").on(
      table.userId,
      table.experimentVersion,
    ),
  ],
);

export const experimentEvents = mysqlTable(
  "experiment_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    sessionId: varchar("sessionId", { length: 96 }),
    experimentVersion: varchar("experimentVersion", { length: 32 }).notNull(),
    eventName: mysqlEnum("eventName", [
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
    ]).notNull(),
    metadata: text("metadata"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("experiment_events_version_event_idx").on(
      table.experimentVersion,
      table.eventName,
    ),
  ],
);

export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type InsertDailyCheckin = typeof dailyCheckins.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type Skoot = typeof skoots.$inferSelect;
export type SkootOutcome = typeof skootOutcomes.$inferSelect;
export type ValidationFeedback = typeof validationFeedback.$inferSelect;
export type ExperimentEvent = typeof experimentEvents.$inferSelect;

export const highLevelConnections = mysqlTable(
  "highlevel_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: varchar("locationId", { length: 96 }).notNull(),
    companyId: varchar("companyId", { length: 96 }),
    highLevelUserId: varchar("highLevelUserId", { length: 96 }),
    locationName: varchar("locationName", { length: 240 }),
    userType: mysqlEnum("userType", ["Location", "Company"]).notNull(),
    encryptedAccessToken: text("encryptedAccessToken").notNull(),
    encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
    accessTokenExpiresAt: bigint("accessTokenExpiresAt", { mode: "number" }).notNull(),
    refreshTokenExpiresAt: bigint("refreshTokenExpiresAt", { mode: "number" }).notNull(),
    scopes: text("scopes").notNull(),
    selected: boolean("selected").default(false).notNull(),
    status: mysqlEnum("status", ["active", "expired", "error", "disconnected"])
      .default("active")
      .notNull(),
    lastSyncAt: bigint("lastSyncAt", { mode: "number" }),
    lastSyncError: varchar("lastSyncError", { length: 500 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("highlevel_connections_user_location_idx").on(table.userId, table.locationId),
    index("highlevel_connections_user_selected_idx").on(table.userId, table.selected),
  ],
);

export const highLevelOAuthStates = mysqlTable(
  "highlevel_oauth_states",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stateHash: varchar("stateHash", { length: 64 }).notNull().unique(),
    returnPath: varchar("returnPath", { length: 240 }).default("/founder").notNull(),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    usedAt: bigint("usedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("highlevel_oauth_states_user_expires_idx").on(table.userId, table.expiresAt)],
);

/**
 * User-supplied learning material. `provider` describes the stated source only;
 * Skootly never fetches or scrapes the linked platform.
 */
export const learningSources = mysqlTable(
  "learning_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: mysqlEnum("provider", ["skool_manual", "other_manual"]).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    communityName: varchar("communityName", { length: 300 }),
    lessonUrl: varchar("lessonUrl", { length: 2048 }),
    sourceDate: bigint("sourceDate", { mode: "number" }),
    transcript: text("transcript"),
    homework: text("homework"),
    normalizedConcepts: text("normalizedConcepts"),
    sourceHash: varchar("sourceHash", { length: 64 }).notNull(),
    consentedAt: bigint("consentedAt", { mode: "number" }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("learning_sources_user_hash_idx").on(table.userId, table.sourceHash),
    index("learning_sources_user_enabled_idx").on(table.userId, table.enabled),
  ],
);

export const learningHomeworkItems = mysqlTable(
  "learning_homework_items",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: int("sourceId")
      .notNull()
      .references(() => learningSources.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    details: text("details"),
    engagementType: mysqlEnum("engagementType", [
      "complete_lesson",
      "complete_homework",
      "post_progress",
      "ask_question",
      "reply_to_discussion",
    ]).default("complete_homework").notNull(),
    status: mysqlEnum("status", ["pending", "completed", "dismissed"])
      .default("pending")
      .notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    completedAt: bigint("completedAt", { mode: "number" }),
  },
  table => [
    index("learning_homework_user_status_idx").on(table.userId, table.status),
    index("learning_homework_source_idx").on(table.sourceId),
  ],
);

export const recommendationLearningSources = mysqlTable(
  "recommendation_learning_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recommendationId: int("recommendationId")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    sourceId: int("sourceId")
      .notNull()
      .references(() => learningSources.id, { onDelete: "cascade" }),
    citationReason: varchar("citationReason", { length: 500 }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("recommendation_learning_source_unique_idx").on(
      table.recommendationId,
      table.sourceId,
    ),
    index("recommendation_learning_source_user_idx").on(table.userId, table.sourceId),
  ],
);

/** Stores only an irreversible source hash after a user deletes the raw material. */
export const learningSourceAudit = mysqlTable(
  "learning_source_audit",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceHash: varchar("sourceHash", { length: 64 }).notNull(),
    action: mysqlEnum("action", ["imported", "deleted"]).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("learning_source_audit_user_created_idx").on(table.userId, table.createdAt)],
);

/** User-provided group metadata; Skootly never discovers or enumerates these URLs. */
export const groupContexts = mysqlTable(
  "group_contexts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: mysqlEnum("platform", ["skool", "other"]).notNull(),
    name: varchar("name", { length: 300 }).notNull(),
    groupUrl: varchar("groupUrl", { length: 2048 }).notNull(),
    settingsUrl: varchar("settingsUrl", { length: 2048 }),
    settingsLabel: varchar("settingsLabel", { length: 160 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("group_contexts_user_url_idx").on(table.userId, table.groupUrl),
    index("group_contexts_user_idx").on(table.userId),
  ],
);

export const skootPacks = mysqlTable(
  "skoot_packs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: int("groupId").references(() => groupContexts.id, { onDelete: "set null" }),
    title: varchar("title", { length: 300 }).notNull(),
    triggerPhrases: text("triggerPhrases").notNull(),
    goal: text("goal").notNull(),
    notes: text("notes"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    index("skoot_packs_user_enabled_idx").on(table.userId, table.enabled),
    index("skoot_packs_group_idx").on(table.groupId),
  ],
);

export const skootPackSteps = mysqlTable(
  "skoot_pack_steps",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packId: int("packId")
      .notNull()
      .references(() => skootPacks.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    actionType: mysqlEnum("actionType", [
      "asset_preparation",
      "platform_setup",
      "homework",
      "engagement",
    ]).notNull(),
    actionTitle: text("actionTitle").notNull(),
    rationale: text("rationale").notNull(),
    assetDeliverable: varchar("assetDeliverable", { length: 300 }),
    assetWidth: int("assetWidth"),
    assetHeight: int("assetHeight"),
    assetFormatHints: text("assetFormatHints"),
    requiresConfirmation: boolean("requiresConfirmation").default(false).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("skoot_pack_steps_position_idx").on(table.packId, table.position),
    index("skoot_pack_steps_user_idx").on(table.userId, table.packId),
  ],
);

/** Private text-only Skoot conversation. Ownership is always the signed-in user. */
export const skootConversations = mysqlTable(
  "skoot_conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    consentedAt: bigint("consentedAt", { mode: "number" }).notNull(),
    consentRevokedAt: bigint("consentRevokedAt", { mode: "number" }),
    deletedAt: bigint("deletedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("skoot_conversations_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const skootConversationMessages = mysqlTable(
  "skoot_conversation_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId")
      .notNull()
      .references(() => skootConversations.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["user", "skoot"]).notNull(),
    content: text("content").notNull(),
    citations: text("citations"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("skoot_conversation_messages_owner_idx").on(table.userId, table.conversationId),
    index("skoot_conversation_messages_created_idx").on(table.conversationId, table.createdAt),
  ],
);

export type HighLevelConnection = typeof highLevelConnections.$inferSelect;
export type HighLevelOAuthState = typeof highLevelOAuthStates.$inferSelect;
export type LearningSource = typeof learningSources.$inferSelect;
export type LearningHomeworkItem = typeof learningHomeworkItems.$inferSelect;
export type GroupContext = typeof groupContexts.$inferSelect;
export type SkootPack = typeof skootPacks.$inferSelect;
export type SkootPackStep = typeof skootPackSteps.$inferSelect;
export type SkootConversation = typeof skootConversations.$inferSelect;
export type SkootConversationMessage = typeof skootConversationMessages.$inferSelect;
