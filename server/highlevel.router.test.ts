import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listConnections,
  selectConnection,
  disconnectConnection,
  createStart,
  getAccess,
} = vi.hoisted(() => ({
  listConnections: vi.fn(),
  selectConnection: vi.fn(),
  disconnectConnection: vi.fn(),
  createStart: vi.fn(),
  getAccess: vi.fn(),
}));

vi.mock("./highlevelOAuth", async () => ({
  createHighLevelOAuthStart: createStart,
  disconnectHighLevelConnection: disconnectConnection,
  getHighLevelAccessForUser: getAccess,
  getHighLevelOAuthConfigStatus: vi.fn().mockReturnValue({ configured: true }),
  listHighLevelConnections: listConnections,
  markHighLevelSync: vi.fn(),
  selectHighLevelConnection: selectConnection,
}));

vi.mock("./highlevel", async () => ({
  fetchHighLevelSnapshot: vi.fn(),
  getHighLevelStatus: vi.fn().mockReturnValue({ configured: false }),
}));

import { appRouter } from "./routers";

function context(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("HighLevel router tenant boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listConnections.mockResolvedValue([]);
    selectConnection.mockResolvedValue(undefined);
    disconnectConnection.mockResolvedValue(undefined);
    createStart.mockResolvedValue({ installUrl: "https://marketplace.example/install" });
    getAccess.mockResolvedValue(null);
  });

  it("always lists connections for the authenticated Skootly user", async () => {
    await appRouter.createCaller(context(42)).highLevel.status();
    expect(listConnections).toHaveBeenCalledWith(42);
  });

  it("passes both user ID and connection ID when selecting a location", async () => {
    await appRouter.createCaller(context(42)).highLevel.select({ connectionId: 17 });
    expect(selectConnection).toHaveBeenCalledWith(42, 17);
  });

  it("passes both user ID and connection ID when disconnecting", async () => {
    await appRouter.createCaller(context(99)).highLevel.disconnect({ connectionId: 17 });
    expect(disconnectConnection).toHaveBeenCalledWith(99, 17);
  });

  it("binds the OAuth start state to the authenticated user", async () => {
    await appRouter.createCaller(context(77)).highLevel.start({ returnPath: "/founder" });
    expect(createStart).toHaveBeenCalledWith(77, "/founder");
  });

  it("fails safely when the signed-in user has no connected HighLevel account", async () => {
    await expect(appRouter.createCaller(context(42)).highLevel.snapshot()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Connect your GoHighLevel account first.",
    });
    expect(getAccess).toHaveBeenCalledWith(42);
  });
});
