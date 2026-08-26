import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listSources,
  importSource,
  setSourceEnabled,
  setHomeworkStatus,
  removeSource,
} = vi.hoisted(() => ({
  listSources: vi.fn(),
  importSource: vi.fn(),
  setSourceEnabled: vi.fn(),
  setHomeworkStatus: vi.fn(),
  removeSource: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getLearningSources: listSources,
  importLearningSource: importSource,
  setLearningSourceEnabled: setSourceEnabled,
  setLearningHomeworkStatus: setHomeworkStatus,
  deleteLearningSource: removeSource,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("learning router tenant boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSources.mockResolvedValue([]);
    importSource.mockResolvedValue(11);
    setSourceEnabled.mockResolvedValue(undefined);
    setHomeworkStatus.mockResolvedValue(undefined);
    removeSource.mockResolvedValue(undefined);
  });

  it("binds manual learning reads and imports to the authenticated user", async () => {
    const caller = appRouter.createCaller(context(42));
    await caller.learning.list();
    await caller.learning.import({
      provider: "skool_manual",
      title: "Challenge kickoff",
      transcript: "Build the promise before you invite members.",
      consentConfirmed: true,
    });
    expect(listSources).toHaveBeenCalledWith(42);
    expect(importSource).toHaveBeenCalledWith(42, expect.objectContaining({ title: "Challenge kickoff" }));
  });

  it("passes the authenticated user ID for every source or homework mutation", async () => {
    const caller = appRouter.createCaller(context(99));
    await caller.learning.setEnabled({ sourceId: 3, enabled: false });
    await caller.learning.setHomeworkStatus({ homeworkId: 5, status: "completed" });
    await caller.learning.delete({ sourceId: 3, confirmPermanentDeletion: true });
    expect(setSourceEnabled).toHaveBeenCalledWith(99, 3, false);
    expect(setHomeworkStatus).toHaveBeenCalledWith(99, 5, "completed");
    expect(removeSource).toHaveBeenCalledWith(99, 3);
  });
});
