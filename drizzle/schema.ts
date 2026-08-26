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

export type HighLevelConnection = typeof highLevelConnections.$inferSelect;
export type HighLevelOAuthState = typeof highLevelOAuthStates.$inferSelect;
