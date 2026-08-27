import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupportProfiles: vi.fn(), saveSupportProfile: vi.fn(), getStudentEscalations: vi.fn(), getCreatorEscalations: vi.fn(),
  getStudentEscalationRoute: vi.fn(), createSmartEscalation: vi.fn(), updateEscalationStatus: vi.fn(),
  getEscalationBrief: vi.fn(), createBreakdownNote: vi.fn(), createContentSkootSuggestions: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...mocks,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: String(userId), name: null, email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Smart Escalation protected router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStudentEscalationRoute.mockResolvedValue({
      creatorUserId: 9, packId: 5, hasRelevantPackRule: true, repeatedAttempts: 2,
      csm: { id: 3, bookingUrl: "https://calendar.example.com/csm" },
      coach: { id: 4, bookingUrl: "https://calendar.example.com/coach" },
    });
    mocks.createSmartEscalation.mockImplementation(async input => ({ mode: "escalation", escalationId: 12, escalationType: input.escalationType, routingReason: input.routingReason, bookingUrl: input.bookingUrl }));
    mocks.updateEscalationStatus.mockResolvedValue({ success: true });
    mocks.getEscalationBrief.mockResolvedValue({ escalation: { id: 12 }, checkin: null, actions: [], outcomes: [], knowledge: [], recommendedFocus: "Clarify the constraint." });
    mocks.createBreakdownNote.mockResolvedValue({ noteId: 8, proposalId: 15, packId: 5, studentUserId: 42 });
  });

  it("routes the signed-in student to the lowest-cost available human helper", async () => {
    const result = await appRouter.createCaller(context(42)).escalations.request({ explicitlyRequestsHuman: true, strategyNeeded: false, studentNote: "I tried twice." });
    expect(mocks.getStudentEscalationRoute).toHaveBeenCalledWith(42, undefined);
    expect(mocks.createSmartEscalation).toHaveBeenCalledWith(expect.objectContaining({ creatorUserId: 9, studentUserId: 42, supportProfileId: 3, escalationType: "csm", bookingUrl: "https://calendar.example.com/csm" }));
    expect(result.mode).toBe("escalation");
  });

  it("binds booking updates to the signed-in student", async () => {
    await appRouter.createCaller(context(42)).escalations.markBooked({ escalationId: 12 });
    expect(mocks.updateEscalationStatus).toHaveBeenCalledWith({ actorUserId: 42, escalationId: 12, allowed: "student", status: "booked" });
  });

  it("binds private briefs and post-call proposal creation to the signed-in creator", async () => {
    const caller = appRouter.createCaller(context(9));
    await caller.escalations.brief({ escalationId: 12 });
    const result = await caller.escalations.addBreakdownNote({ escalationId: 12, notes: "The offer language was unclear.", proposedKnowledgeType: "decision_rule", proposedKnowledgeContent: "Clarify the promise before increasing traffic." });
    expect(mocks.getEscalationBrief).toHaveBeenCalledWith(9, 12);
    expect(mocks.createBreakdownNote).toHaveBeenCalledWith(9, expect.objectContaining({ escalationId: 12, proposedKnowledgeType: "decision_rule" }));
    expect(result.proposalId).toBe(15);
  });
});
