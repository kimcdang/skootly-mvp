import {} from "./schema";
import { relations } from "drizzle-orm";
import {
  dailyCheckins,
  experimentEvents,
  recommendations,
  skootOutcomes,
  skoots,
  users,
  validationFeedback,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  dailyCheckins: many(dailyCheckins),
  recommendations: many(recommendations),
  skoots: many(skoots),
  outcomes: many(skootOutcomes),
  validationFeedback: many(validationFeedback),
  experimentEvents: many(experimentEvents),
}));

export const dailyCheckinsRelations = relations(dailyCheckins, ({ one, many }) => ({
  user: one(users, { fields: [dailyCheckins.userId], references: [users.id] }),
  recommendations: many(recommendations),
  skoots: many(skoots),
}));

export const recommendationsRelations = relations(recommendations, ({ one, many }) => ({
  user: one(users, { fields: [recommendations.userId], references: [users.id] }),
  checkin: one(dailyCheckins, {
    fields: [recommendations.checkinId],
    references: [dailyCheckins.id],
  }),
  skoots: many(skoots),
}));

export const skootsRelations = relations(skoots, ({ one, many }) => ({
  user: one(users, { fields: [skoots.userId], references: [users.id] }),
  checkin: one(dailyCheckins, { fields: [skoots.checkinId], references: [dailyCheckins.id] }),
  recommendation: one(recommendations, {
    fields: [skoots.recommendationId],
    references: [recommendations.id],
  }),
  outcomes: many(skootOutcomes),
}));

export const skootOutcomesRelations = relations(skootOutcomes, ({ one }) => ({
  user: one(users, { fields: [skootOutcomes.userId], references: [users.id] }),
  skoot: one(skoots, { fields: [skootOutcomes.skootId], references: [skoots.id] }),
}));

export const validationFeedbackRelations = relations(validationFeedback, ({ one }) => ({
  user: one(users, { fields: [validationFeedback.userId], references: [users.id] }),
}));

export const experimentEventsRelations = relations(experimentEvents, ({ one }) => ({
  user: one(users, { fields: [experimentEvents.userId], references: [users.id] }),
}));
