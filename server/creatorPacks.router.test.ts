import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approveCreatorPackProposal: vi.fn(),
  assignCreatorPackStudent: vi.fn(),
  createCreatorPackInvite: vi.fn(),
  createCreatorWorkspaceInvite: vi.fn(),
  createPilotCreatorWorkspaceInvite: vi.fn(),
  createGuidedCreatorPack: vi.fn(),
  getCreatorPackInvitePreview: vi.fn(),
  getCreatorWorkspaceInvitePreview: vi.fn(),
  getCreatorWorkspaceInvites: vi.fn(),
  getCreatorPackOperatingView: vi.fn(),
  getMyPackExecution: vi.fn(),
  getMyPackJourney: vi.fn(),
  publishGuidedCreatorPackRevision: vi.fn(),
  recordMyPackExecutionFeedback: vi.fn(),
  rollEnrollmentToActiveVersion: vi.fn(),
  acceptCreatorPackInvite: vi.fn(),
  acceptCreatorWorkspaceInvite: vi.fn(),
  revokeCreatorWorkspaceInvite: vi.fn(),
  getCoachOnboarding: vi.fn(),
  selectCoachOnboardingRole: vi.fn(),
  saveCoachOnboardingProfile: vi.fn(),
  saveCoachOnboardingMethod: vi.fn(),
  completeCoachOnboarding: vi.fn(),
  restartCoachOnboarding: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  approveCreatorPackProposal: mocks.approveCreatorPackProposal,
  assignCreatorPackStudent: mocks.assignCreatorPackStudent,
  createCreatorPackInvite: mocks.createCreatorPackInvite,
  createCreatorWorkspaceInvite: mocks.createCreatorWorkspaceInvite,
  createPilotCreatorWorkspaceInvite: mocks.createPilotCreatorWorkspaceInvite,
  createGuidedCreatorPack: mocks.createGuidedCreatorPack,
  getCreatorPackInvitePreview: mocks.getCreatorPackInvitePreview,
  getCreatorWorkspaceInvitePreview: mocks.getCreatorWorkspaceInvitePreview,
  getCreatorWorkspaceInvites: mocks.getCreatorWorkspaceInvites,
  getCreatorPackOperatingView: mocks.getCreatorPackOperatingView,
  getMyPackExecution: mocks.getMyPackExecution,
  getMyPackJourney: mocks.getMyPackJourney,
  publishGuidedCreatorPackRevision: mocks.publishGuidedCreatorPackRevision,
  recordMyPackExecutionFeedback: mocks.recordMyPackExecutionFeedback,
  rollEnrollmentToActiveVersion: mocks.rollEnrollmentToActiveVersion,
  acceptCreatorPackInvite: mocks.acceptCreatorPackInvite,
  acceptCreatorWorkspaceInvite: mocks.acceptCreatorWorkspaceInvite,
  revokeCreatorWorkspaceInvite: mocks.revokeCreatorWorkspaceInvite,
  getCoachOnboarding: mocks.getCoachOnboarding,
  selectCoachOnboardingRole: mocks.selectCoachOnboardingRole,
  saveCoachOnboardingProfile: mocks.saveCoachOnboardingProfile,
  saveCoachOnboardingMethod: mocks.saveCoachOnboardingMethod,
  completeCoachOnboarding: mocks.completeCoachOnboarding,
  restartCoachOnboarding: mocks.restartCoachOnboarding,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number, email = `user-${userId}@example.com`): TrpcContext {
  return {
    user: { id: userId, openId: String(userId), name: "User", email, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
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

  it("binds Pack Builder approval and invite creation to the authenticated creator", async () => {
    const draft = { templateKind: "client_implementation" as const, name: "Client path", destination: "Client result", audience: "Active clients", cadenceLabel: "Weekly", milestones: [1, 2, 3].map(position => ({ position, title: `Step ${position}`, definitionOfDone: "Done", defaultSkoot: "Do the next useful thing", feedbackPrompt: "What happened?" })) };
    mocks.createGuidedCreatorPack.mockResolvedValue({ packId: 55, versionId: 7, versionNumber: 1 });
    mocks.createCreatorPackInvite.mockResolvedValue({ inviteId: 8, token: "x".repeat(43), expiresAt: 123 });
    const caller = appRouter.createCaller(context(7));
    await caller.creatorPacks.createGuided(draft);
    await caller.creatorPacks.createInvite({ packId: 55, email: "student@example.com", expiresInDays: 7 });
    expect(mocks.createGuidedCreatorPack).toHaveBeenCalledWith(7, draft);
    expect(mocks.createCreatorPackInvite).toHaveBeenCalledWith(7, 55, "student@example.com", 7);
  });

  it("binds enrollment, execution feedback, and private operating actions to their authenticated owner", async () => {
    mocks.acceptCreatorPackInvite.mockResolvedValue({ packId: 5, alreadyEnrolled: false });
    mocks.recordMyPackExecutionFeedback.mockResolvedValue(null);
    mocks.getCreatorPackOperatingView.mockResolvedValue([]);
    mocks.rollEnrollmentToActiveVersion.mockResolvedValue({ success: true, versionId: 6 });
    const student = appRouter.createCaller(context(42));
    await student.creatorPacks.acceptInvite({ token: "x".repeat(43) });
    await student.creatorPacks.recordExecutionFeedback({ feedbackStatus: "stuck", detail: "Need help" });
    const creator = appRouter.createCaller(context(7));
    await creator.creatorPacks.operatingView({ packId: 5 });
    await creator.creatorPacks.rollEnrollmentForward({ enrollmentId: 9 });
    expect(mocks.acceptCreatorPackInvite).toHaveBeenCalledWith(42, "user-42@example.com", "x".repeat(43));
    expect(mocks.recordMyPackExecutionFeedback).toHaveBeenCalledWith(42, { feedbackStatus: "stuck", detail: "Need help" });
    expect(mocks.getCreatorPackOperatingView).toHaveBeenCalledWith(7, 5);
    expect(mocks.rollEnrollmentToActiveVersion).toHaveBeenCalledWith(7, 9);
  });

  it("binds creator invitations and acceptance to the authenticated inviter and exact signed-in email", async () => {
    mocks.createCreatorWorkspaceInvite.mockResolvedValue({ inviteId: 12, token: "x".repeat(43), expiresAt: 123 });
    mocks.getCreatorWorkspaceInvites.mockResolvedValue([]);
    mocks.revokeCreatorWorkspaceInvite.mockResolvedValue({ success: true });
    mocks.getCreatorWorkspaceInvitePreview.mockResolvedValue({ inviterName: "Creator", emailHint: "c•••@example.com", expiresAt: 123 });
    mocks.acceptCreatorWorkspaceInvite.mockResolvedValue({ success: true, creatorUrl: "/creator" });
    const owner = appRouter.createCaller(context(7));
    const invitee = appRouter.createCaller(context(42, "creator@example.com"));

    await owner.creatorPacks.createCreatorInvite({ email: "creator@example.com", expiresInDays: 7 });
    await owner.creatorPacks.listCreatorInvites();
    await owner.creatorPacks.revokeCreatorInvite({ inviteId: 12 });
    await invitee.creatorPacks.creatorInvitePreview({ token: "x".repeat(43) });
    await invitee.creatorPacks.acceptCreatorInvite({ token: "x".repeat(43) });

    expect(mocks.createCreatorWorkspaceInvite).toHaveBeenCalledWith(7, "creator@example.com", 7);
    expect(mocks.getCreatorWorkspaceInvites).toHaveBeenCalledWith(7);
    expect(mocks.revokeCreatorWorkspaceInvite).toHaveBeenCalledWith(7, 12);
    expect(mocks.getCreatorWorkspaceInvitePreview).toHaveBeenCalledWith("x".repeat(43));
    expect(mocks.acceptCreatorWorkspaceInvite).toHaveBeenCalledWith(42, "creator@example.com", "x".repeat(43));
  });

  it("keeps Coach onboarding selections, method notes, and completion bound to the signed-in Coach", async () => {
    mocks.getCoachOnboarding.mockResolvedValue(null);
    mocks.selectCoachOnboardingRole.mockResolvedValue({ userId: 7, selectedRole: "coach", stage: "profile" });
    mocks.saveCoachOnboardingProfile.mockResolvedValue({ userId: 7, selectedRole: "coach", stage: "method" });
    mocks.saveCoachOnboardingMethod.mockResolvedValue({ userId: 7, selectedRole: "coach", stage: "method" });
    mocks.completeCoachOnboarding.mockResolvedValue({ userId: 7, selectedRole: "coach", stage: "launch", packId: 55 });
    const caller = appRouter.createCaller(context(7));
    const profile = { displayName: "Coach Kim", avatarUrl: "", offer: "Launch a focused challenge", audience: "Coaches", templateKind: "five_day_challenge" as const };

    await caller.creatorPacks.onboarding();
    await caller.creatorPacks.selectOnboardingRole({ selectedRole: "coach" });
    await caller.creatorPacks.saveOnboardingProfile(profile);
    await caller.creatorPacks.saveOnboardingMethod({ methodNotes: "I help coaches turn their knowledge into a focused five day challenge with one clear execution move each day.", methodSourceKind: "notes" });
    await caller.creatorPacks.completeOnboarding({ packId: 55 });

    expect(mocks.getCoachOnboarding).toHaveBeenCalledWith(7);
    expect(mocks.selectCoachOnboardingRole).toHaveBeenCalledWith(7, "coach");
    expect(mocks.saveCoachOnboardingProfile).toHaveBeenCalledWith(7, profile);
    expect(mocks.saveCoachOnboardingMethod).toHaveBeenCalledWith(7, expect.objectContaining({ methodSourceKind: "notes" }));
    expect(mocks.completeCoachOnboarding).toHaveBeenCalledWith(7, 55);
  });

  it("binds safe onboarding replay and the single-pilot creator invite to the signed-in owner", async () => {
    mocks.restartCoachOnboarding.mockResolvedValue({ userId: 7, selectedRole: "coach", stage: "profile" });
    mocks.createPilotCreatorWorkspaceInvite.mockResolvedValue({ inviteId: 19, token: "x".repeat(43), expiresAt: 123 });
    const caller = appRouter.createCaller(context(7));

    await caller.creatorPacks.restartOnboarding();
    await caller.creatorPacks.createPilotCreatorInvite({ email: "pilot@example.com", expiresInDays: 7 });

    expect(mocks.restartCoachOnboarding).toHaveBeenCalledWith(7);
    expect(mocks.createPilotCreatorWorkspaceInvite).toHaveBeenCalledWith(7, "pilot@example.com", 7);
  });
});
