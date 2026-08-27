import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBusinessSnapshot: vi.fn(), getOpenBusinessActions: vi.fn(), getBusinessActionById: vi.fn(),
  upsertBusinessProfile: vi.fn(), createBusinessActions: vi.fn(), updateBusinessActionStatus: vi.fn(),
  recordBusinessActionOutcome: vi.fn(), fetchHighLevelActionPayloads: vi.fn(), getHighLevelAccessForUser: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()),
  getBusinessSnapshot: mocks.getBusinessSnapshot, getOpenBusinessActions: mocks.getOpenBusinessActions,
  getBusinessActionById: mocks.getBusinessActionById, upsertBusinessProfile: mocks.upsertBusinessProfile,
  createBusinessActions: mocks.createBusinessActions, updateBusinessActionStatus: mocks.updateBusinessActionStatus,
  recordBusinessActionOutcome: mocks.recordBusinessActionOutcome,
}));
vi.mock("./highlevel", async importOriginal => ({ ...(await importOriginal<typeof import("./highlevel")>()), fetchHighLevelActionPayloads: mocks.fetchHighLevelActionPayloads }));
vi.mock("./highlevelOAuth", async importOriginal => ({ ...(await importOriginal<typeof import("./highlevelOAuth")>()), getHighLevelAccessForUser: mocks.getHighLevelAccessForUser }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number): TrpcContext { return { user: { id: userId, openId: String(userId), name: null, email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("action-engine router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBusinessProfile = undefined as never;
    mocks.getOpenBusinessActions.mockResolvedValue([]);
    mocks.getHighLevelAccessForUser.mockResolvedValue({ accessToken: "redacted", connection: { locationId: "location-a" } });
    mocks.fetchHighLevelActionPayloads.mockResolvedValue({ contacts: { contacts: [{ id: "webinar-1", tags: ["webinar"] }] }, opportunities: { opportunities: [{ id: "opp-1", status: "open", monetaryValue: 24000, updatedAt: Date.now() }] } });
    mocks.createBusinessActions.mockResolvedValue([{ id: 1, title: "Follow up", priorityScore: 18 }]);
    mocks.updateBusinessActionStatus.mockResolvedValue({ success: true, status: "completed" });
    mocks.recordBusinessActionOutcome.mockResolvedValue({ success: true });
  });

  it("uses only the signed-in owner’s selected HighLevel access and stores at most two candidates", async () => {
    const db = await import("./db");
    vi.spyOn(db, "getBusinessProfile").mockResolvedValue({ id: 9, userId: 42, companyName: "Freight", primaryGoal: "Revenue", monthlyRevenueGoal: null, primaryOffer: null, offerPrice: null, primaryAcquisitionMethod: null, importantNotes: null, currentBottleneck: null, defaultPlaybookId: "core_revenue_focus", createdAt: 1, updatedAt: 1 });
    const result = await appRouter.createCaller(context(42)).actionEngine.generateNextActions();
    expect(mocks.getHighLevelAccessForUser).toHaveBeenCalledWith(42);
    expect(mocks.fetchHighLevelActionPayloads).toHaveBeenCalledWith({ token: "redacted", locationId: "location-a" });
    expect(mocks.createBusinessActions.mock.calls[0][0]).toBe(42);
    expect(mocks.createBusinessActions.mock.calls[0][2]).toHaveLength(2);
    expect(result.reused).toBe(false);
  });

  it("requires a connected selected account before generating CRM actions", async () => {
    const db = await import("./db");
    vi.spyOn(db, "getBusinessProfile").mockResolvedValue({ id: 9, userId: 42, companyName: "Freight", primaryGoal: "Revenue", monthlyRevenueGoal: null, primaryOffer: null, offerPrice: null, primaryAcquisitionMethod: null, importantNotes: null, currentBottleneck: null, defaultPlaybookId: "core_revenue_focus", createdAt: 1, updatedAt: 1 });
    mocks.getHighLevelAccessForUser.mockResolvedValue(null);
    await expect(appRouter.createCaller(context(42)).actionEngine.generateNextActions()).rejects.toThrow("Connect your GoHighLevel account");
  });

  it("binds action status and detailed outcome writes to the authenticated owner", async () => {
    const caller = appRouter.createCaller(context(42));
    await caller.actionEngine.completeAction({ actionId: 7, status: "completed" });
    await caller.actionEngine.recordActionOutcome({ actionId: 7, contactsContacted: 8, replies: 3, bookings: 2, purchases: 1, outcomeValue: 5000, learningNote: "Warm webinar leads converted." });
    expect(mocks.updateBusinessActionStatus).toHaveBeenCalledWith(42, 7, "completed");
    expect(mocks.recordBusinessActionOutcome).toHaveBeenCalledWith(42, expect.objectContaining({ actionId: 7, bookings: 2, outcomeValue: 5000 }));
  });
});
