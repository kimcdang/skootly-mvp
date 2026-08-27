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

export const userCredentials = mysqlTable(
  "user_credentials",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("user_credentials_user_id_uq").on(table.userId),
    uniqueIndex("user_credentials_email_uq").on(table.email),
  ],
);

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

/** Compact business memory for deterministic action generation. One profile belongs to one signed-in owner. */
export const businessProfiles = mysqlTable(
  "business_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyName: varchar("companyName", { length: 300 }).notNull(),
    primaryGoal: text("primaryGoal").notNull(),
    monthlyRevenueGoal: decimal("monthlyRevenueGoal", { precision: 14, scale: 2 }),
    primaryOffer: varchar("primaryOffer", { length: 400 }),
    offerPrice: decimal("offerPrice", { precision: 14, scale: 2 }),
    primaryAcquisitionMethod: varchar("primaryAcquisitionMethod", { length: 400 }),
    importantNotes: text("importantNotes"),
    currentBottleneck: text("currentBottleneck"),
    defaultPlaybookId: varchar("defaultPlaybookId", { length: 120 }).default("core_revenue_focus").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("business_profiles_user_unique").on(table.userId)],
);

/** Persisted action-engine output. This remains separate from daily Skoots so a CRM signal does not require a check-in. */
export const businessActions = mysqlTable(
  "business_actions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    businessProfileId: int("businessProfileId").notNull().references(() => businessProfiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 700 }).notNull(),
    description: text("description").notNull(),
    priorityScore: int("priorityScore").notNull(),
    source: mysqlEnum("source", ["highlevel", "manual", "playbook"]).notNull(),
    signal: text("signal").notNull(),
    recommendedAction: text("recommendedAction").notNull(),
    estimatedValue: decimal("estimatedValue", { precision: 14, scale: 2 }),
    assignedTo: varchar("assignedTo", { length: 240 }),
    relatedContactIds: text("relatedContactIds"),
    relatedContactUrls: text("relatedContactUrls"),
    status: mysqlEnum("status", ["recommended", "in_progress", "completed", "dismissed"]).default("recommended").notNull(),
    playbookId: varchar("playbookId", { length: 120 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    completedAt: bigint("completedAt", { mode: "number" }),
    dismissedAt: bigint("dismissedAt", { mode: "number" }),
  },
  table => [
    index("business_actions_owner_status_idx").on(table.userId, table.status),
    index("business_actions_profile_score_idx").on(table.businessProfileId, table.priorityScore),
  ],
);

/** Detailed result record for signal → action → outcome learning data, without performing automatic optimization. */
export const businessActionOutcomes = mysqlTable(
  "business_action_outcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    actionId: int("actionId").notNull().references(() => businessActions.id, { onDelete: "cascade" }),
    contactsContacted: int("contactsContacted").default(0).notNull(),
    replies: int("replies").default(0).notNull(),
    bookings: int("bookings").default(0).notNull(),
    purchases: int("purchases").default(0).notNull(),
    outcomeValue: decimal("outcomeValue", { precision: 14, scale: 2 }),
    notes: text("notes"),
    learningNote: text("learningNote"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("business_action_outcomes_owner_idx").on(table.userId, table.createdAt)],
);

/** A creator-owned distributed knowledge pack. Personal prompt packs remain separate. */
export const creatorSkootPacks = mysqlTable(
  "creator_skoot_packs",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 300 }).notNull(),
    description: text("description"),
    activeVersionId: int("activeVersionId"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("creator_skoot_packs_owner_idx").on(table.creatorUserId, table.updatedAt)],
);

/** Immutable, approved snapshot. New knowledge always produces a new version rather than rewriting history. */
export const creatorPackVersions = mysqlTable(
  "creator_pack_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    versionNumber: int("versionNumber").notNull(),
    changeSummary: text("changeSummary").notNull(),
    approvedAt: bigint("approvedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("creator_pack_versions_unique").on(table.packId, table.versionNumber), index("creator_pack_versions_owner_idx").on(table.creatorUserId, table.approvedAt)],
);

export const creatorPackKnowledge = mysqlTable(
  "creator_pack_knowledge",
  {
    id: int("id").autoincrement().primaryKey(),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    versionId: int("versionId").notNull().references(() => creatorPackVersions.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    knowledgeType: mysqlEnum("knowledgeType", ["principle", "framework", "diagnostic_rule", "decision_rule", "milestone", "skoot_action", "script", "not_today", "example"]).notNull(),
    content: text("content").notNull(),
    sourceText: text("sourceText"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("creator_pack_knowledge_version_idx").on(table.versionId, table.knowledgeType)],
);

export const creatorPackProposals = mysqlTable(
  "creator_pack_proposals",
  {
    id: int("id").autoincrement().primaryKey(),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceText: text("sourceText").notNull(),
    proposedType: mysqlEnum("proposedType", ["principle", "framework", "diagnostic_rule", "decision_rule", "milestone", "skoot_action", "script", "not_today", "example"]).notNull(),
    proposedContent: text("proposedContent").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "cancelled"]).default("pending").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    resolvedAt: bigint("resolvedAt", { mode: "number" }),
  },
  table => [index("creator_pack_proposals_owner_idx").on(table.creatorUserId, table.status)],
);

export const creatorPackAssignments = mysqlTable(
  "creator_pack_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    assignedAt: bigint("assignedAt", { mode: "number" }).notNull(),
    revokedAt: bigint("revokedAt", { mode: "number" }),
  },
  table => [uniqueIndex("creator_pack_assignment_unique").on(table.packId, table.studentUserId), index("creator_pack_assignments_student_idx").on(table.studentUserId, table.revokedAt)],
);

/** Student-owned answers used only to locate Point A within an assigned Pack. */
export const creatorPackDiagnosticAnswers = mysqlTable(
  "creator_pack_diagnostic_answers",
  {
    id: int("id").autoincrement().primaryKey(),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionKey: varchar("questionKey", { length: 255 }).notNull(),
    questionText: text("questionText").notNull(),
    answer: text("answer").notNull(),
    source: mysqlEnum("source", ["student", "inferred"]).default("student").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("pack_diag_answer_unique").on(table.packId, table.studentUserId, table.questionKey), index("pack_diag_student_idx").on(table.studentUserId, table.packId, table.updatedAt)],
);

export const creatorPackAttributions = mysqlTable(
  "creator_pack_attributions",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    packId: int("packId").notNull().references(() => creatorSkootPacks.id, { onDelete: "cascade" }),
    packVersionId: int("packVersionId").notNull().references(() => creatorPackVersions.id, { onDelete: "cascade" }),
    knowledgeId: int("knowledgeId").references(() => creatorPackKnowledge.id, { onDelete: "set null" }),
    recommendationId: int("recommendationId").references(() => recommendations.id, { onDelete: "set null" }),
    skootId: int("skootId").references(() => skoots.id, { onDelete: "set null" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("creator_pack_attr_student_idx").on(table.studentUserId, table.createdAt), index("creator_pack_attr_creator_idx").on(table.creatorUserId, table.createdAt)],
);

export const supportProfiles = mysqlTable(
  "support_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    routingLevel: mysqlEnum("routingLevel", ["csm", "coach"]).notNull(),
    displayName: varchar("displayName", { length: 300 }).notNull(),
    bookingUrl: varchar("bookingUrl", { length: 2048 }),
    active: boolean("active").default(true).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("support_profiles_creator_idx").on(table.creatorUserId, table.routingLevel, table.active)],
);

export const smartEscalations = mysqlTable(
  "smart_escalations",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    supportProfileId: int("supportProfileId").references(() => supportProfiles.id, { onDelete: "set null" }),
    relatedSkootId: int("relatedSkootId").references(() => skoots.id, { onDelete: "set null" }),
    relatedRecommendationId: int("relatedRecommendationId").references(() => recommendations.id, { onDelete: "set null" }),
    packId: int("packId").references(() => creatorSkootPacks.id, { onDelete: "set null" }),
    escalationType: mysqlEnum("escalationType", ["csm", "coach"]).notNull(),
    routingReason: text("routingReason").notNull(),
    bookingUrl: varchar("bookingUrl", { length: 2048 }),
    status: mysqlEnum("status", ["requested", "booked", "completed", "declined"]).default("requested").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    resolvedAt: bigint("resolvedAt", { mode: "number" }),
  },
  table => [index("smart_escalations_student_idx").on(table.studentUserId, table.status, table.createdAt), index("smart_escalations_creator_idx").on(table.creatorUserId, table.status, table.createdAt)],
);

export const breakdownNotes = mysqlTable(
  "breakdown_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    escalationId: int("escalationId").notNull().references(() => smartEscalations.id, { onDelete: "cascade" }),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    notes: text("notes").notNull(),
    clientNextAction: text("clientNextAction"),
    proposedKnowledgeType: mysqlEnum("proposedKnowledgeType", ["principle", "framework", "diagnostic_rule", "decision_rule", "milestone", "skoot_action", "script", "not_today", "example"]),
    proposedKnowledgeContent: text("proposedKnowledgeContent"),
    reviewStatus: mysqlEnum("reviewStatus", ["pending", "added", "ignored"]).default("pending").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("breakdown_notes_escalation_idx").on(table.escalationId, table.createdAt)],
);

export const contentSkoots = mysqlTable(
  "content_skoots",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    bottleneckLabel: varchar("bottleneckLabel", { length: 1000 }).notNull(),
    occurrenceCount: int("occurrenceCount").notNull(),
    title: varchar("title", { length: 1000 }).notNull(),
    format: varchar("format", { length: 300 }).notNull(),
    outline: text("outline").notNull(),
    identifiableConsent: boolean("identifiableConsent").default(false).notNull(),
    status: mysqlEnum("status", ["suggested", "accepted", "dismissed"]).default("suggested").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("content_skoots_creator_idx").on(table.creatorUserId, table.status, table.createdAt)],
);

/** Private notification for a creator or explicitly assigned support user. */
export const supportNotifications = mysqlTable(
  "support_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: int("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    escalationId: int("escalationId").notNull().references(() => smartEscalations.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull(),
    deepLink: varchar("deepLink", { length: 1000 }).notNull(),
    readAt: bigint("readAt", { mode: "number" }),
    dismissedAt: bigint("dismissedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("support_notif_recipient_idx").on(table.recipientUserId, table.dismissedAt, table.createdAt)],
);

/** Separate, revocable consent gate for any future identifiable content use. No publishing workflow consumes this table. */
export const identifiableContentConsents = mysqlTable(
  "identifiable_content_consents",
  {
    id: int("id").autoincrement().primaryKey(),
    creatorUserId: int("creatorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: mysqlEnum("scope", ["name", "result", "recording", "screenshot", "business_info"]).notNull(),
    purpose: varchar("purpose", { length: 1000 }).notNull(),
    consentedAt: bigint("consentedAt", { mode: "number" }).notNull(),
    revokedAt: bigint("revokedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("ident_content_consent_unique").on(table.creatorUserId, table.studentUserId, table.scope), index("ident_content_student_idx").on(table.studentUserId, table.revokedAt)],
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
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type BusinessAction = typeof businessActions.$inferSelect;
export type BusinessActionOutcome = typeof businessActionOutcomes.$inferSelect;
export type CreatorSkootPack = typeof creatorSkootPacks.$inferSelect;
export type CreatorPackVersion = typeof creatorPackVersions.$inferSelect;
export type CreatorPackKnowledge = typeof creatorPackKnowledge.$inferSelect;
export type CreatorPackDiagnosticAnswer = typeof creatorPackDiagnosticAnswers.$inferSelect;
export type SupportProfile = typeof supportProfiles.$inferSelect;
export type SmartEscalation = typeof smartEscalations.$inferSelect;
export type SupportNotification = typeof supportNotifications.$inferSelect;
export type IdentifiableContentConsent = typeof identifiableContentConsents.$inferSelect;
