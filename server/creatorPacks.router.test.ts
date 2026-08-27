import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approveCreatorPackProposal: vi.fn(),
  assignCreatorPackStudent: vi.fn(),
  getMyPackJourney: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  approveCreatorPackProposal: mocks.approveCreatorPackProposal,
  assignCreatorPackStudent: mocks.assignCreatorPackStudent,
  getMyPackJourney: mocks.getMyPackJourney,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: String(userId), name: "User", email: `user-${userId}@example.com`, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Creator Pack authenticated ownership contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds proposal approval and student assignment to the authenticated creator", async () => {
    mocks.approveCreatorPackProposal.mockResolvedValue({ versionId: 8, versionNumber: 2 });
    mocks.assignCreatorPackStudent.mockResolvedValue({ student: { id: 42, email: "student@example.com", name: "Student" } });
    const caller = appRouter.createCaller(context(7));

    await caller.creatorPacks.approve({ proposalId: 3, content: "Edited approved rule", knowledgeType: "decision_rule" });
    await caller.creatorPacks.assign({ packId: 5, studentEmail: "student@example.com" });

    expect(mocks.approveCreatorPackProposal).toHaveBeenCalledWith(7, { proposalId: 3, content: "Edited approved rule", knowledgeType: "decision_rule" });
    expect(mocks.assignCreatorPackStudent).toHaveBeenCalledWith(7, 5, "student@example.com");
  });

  it("binds journey resolution to the authenticated student", async () => {
    mocks.getMyPackJourney.mockResolvedValue(null);
    await appRouter.createCaller(context(42)).creatorPacks.myJourney();
    expect(mocks.getMyPackJourney).toHaveBeenCalledWith(42);
  });
});
