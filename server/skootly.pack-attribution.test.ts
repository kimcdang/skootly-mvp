import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckin: vi.fn(),
  getEnabledLearningContextWithSources: vi.fn(),
  getAssignedCreatorPackContext: vi.fn(),
  saveRecommendation: vi.fn(),
  saveRecommendationLearningSources: vi.fn(),
  saveCreatorPackRecommendationAttribution: vi.fn(),
  trackEvent: vi.fn(),
  generateRecommendation: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  createCheckin: mocks.createCheckin,
  getEnabledLearningContextWithSources: mocks.getEnabledLearningContextWithSources,
  getAssignedCreatorPackContext: mocks.getAssignedCreatorPackContext,
  saveRecommendation: mocks.saveRecommendation,
  saveRecommendationLearningSources: mocks.saveRecommendationLearningSources,
  saveCreatorPackRecommendationAttribution: mocks.saveCreatorPackRecommendationAttribution,
  trackEvent: mocks.trackEvent,
}));

vi.mock("./skootlyEngine", async importOriginal => ({
  ...(await importOriginal<typeof import("./skootlyEngine")>()),
  generateRecommendation: mocks.generateRecommendation,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: String(userId), name: "Student", email: "student@example.com", loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Creator Pack recommendation attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCheckin.mockResolvedValue(11);
    mocks.getEnabledLearningContextWithSources.mockResolvedValue({ context: "", sourceIds: [] });
    mocks.getAssignedCreatorPackContext.mockResolvedValue({
      packId: 5,
      creatorUserId: 9,
      packName: "Freight to Freedom",
      creatorName: "Creator",
      version: { id: 7, versionNumber: 3 },
      knowledge: [{ id: 21, knowledgeType: "decision_rule", content: "Follow up with warm leads before creating a new campaign." }],
    });
    mocks.generateRecommendation.mockResolvedValue({
      modelId: "gpt-5-mini",
      recommendation: {
        mode: "recommendation",
        goalSummary: "Book qualified calls",
        bottleneck: "Warm follow-up is stalled",
        rationale: "The Pack prioritizes existing opportunity before new acquisition.",
        notTodayReason: "Protect the conversion window.",
        notTodayItems: ["Build a new funnel"],
        actions: [{ title: "Follow up with five warm leads", reasoning: "This is the shortest path to a booked call.", estimatedImpact: "high" }],
      },
    });
    mocks.saveRecommendation.mockResolvedValue(22);
  });

  it("grounds generation in server-fetched Pack knowledge and saves student attribution", async () => {
    await appRouter.createCaller(context(42)).skootly.generate({
      experimentVersion: "coach",
      goal: "Book qualified calls",
      currentState: "Five warm leads attended the webinar.",
      blocker: "No follow-up has been sent.",
      availableTime: "30_minutes",
      energyLevel: "steady",
    });

    expect(mocks.getAssignedCreatorPackContext).toHaveBeenCalledWith(42);
    expect(mocks.generateRecommendation).toHaveBeenCalledWith(expect.objectContaining({
      learningContext: expect.stringContaining("Follow up with warm leads before creating a new campaign."),
    }));
    expect(mocks.saveCreatorPackRecommendationAttribution).toHaveBeenCalledWith(42, 22);
  });
});
