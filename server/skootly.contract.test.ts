import { describe, expect, it } from "vitest";
import {
  dailyCheckinInputSchema,
  recommendationOutputSchema,
} from "../shared/skootly";
import { buildRecommendationPrompt } from "./skootlyEngine";

const recommendation = {
  mode: "recommendation" as const,
  clarificationQuestion: "",
  goal: "Collect $20,000 this month",
  bottleneck: "Warm opportunities have not received a follow-up",
  why: "Existing opportunities are closer to cash than new lead generation.",
  primarySkoot: {
    title: "Follow up with the six warmest opportunities",
    reasoning: "This is the shortest path to a reply or payment today.",
    estimatedImpact: "high" as const,
  },
  secondarySkoot: {
    enabled: false,
    title: "",
    reasoning: "",
    estimatedImpact: "low" as const,
  },
  notToday: ["Rewrite the website", "Research a new CRM"],
  notTodayReason: "Neither action addresses the current constraint.",
};

describe("Skootly decision contract", () => {
  it("accepts one primary Skoot, one optional secondary Skoot, and up to three distractions", () => {
    expect(recommendationOutputSchema.parse(recommendation)).toEqual(recommendation);
  });

  it("rejects more than three Not Today items", () => {
    expect(() => recommendationOutputSchema.parse({
      ...recommendation,
      notToday: ["One", "Two", "Three", "Four"],
    })).toThrow();
  });

  it("includes normalized CRM context in the model prompt without requiring raw records", () => {
    const input = dailyCheckinInputSchema.parse({
      experimentVersion: "founder",
      goal: "Increase collected revenue",
      currentState: "Several proposals are open",
      blocker: "Follow-up is inconsistent",
      availableTime: "30_minutes",
      energyLevel: "steady",
      highLevelContext: "Contacts: 24. Opportunities: 6 total, 4 open, 2 stale.",
    });
    const prompt = buildRecommendationPrompt(input);
    expect(prompt).toContain("NORMALIZED GOHIGHLEVEL CONTEXT");
    expect(prompt).toContain("4 open");
  });
});
