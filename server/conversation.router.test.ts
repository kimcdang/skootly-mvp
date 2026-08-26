import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createConversation,
  getLatestConversation,
  appendConversationMessage,
  deleteConversation,
  getConversationGrounding,
  generateReply,
} = vi.hoisted(() => ({
  createConversation: vi.fn(),
  getLatestConversation: vi.fn(),
  appendConversationMessage: vi.fn(),
  deleteConversation: vi.fn(),
  getConversationGrounding: vi.fn(),
  generateReply: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  createConversation,
  getLatestConversation,
  appendConversationMessage,
  deleteConversation,
  getConversationGrounding,
}));

vi.mock("./conversation", () => ({ generateSkootConversationReply: generateReply }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: `user-${userId}`, name: `User ${userId}`, email: `user${userId}@example.com`, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("private Skoot conversation router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createConversation.mockResolvedValue(7);
    getLatestConversation.mockResolvedValue({
      conversation: { id: 7 },
      messages: [{ role: "user", content: "Help me decide." }],
    });
    appendConversationMessage.mockResolvedValue(undefined);
    deleteConversation.mockResolvedValue(undefined);
    getConversationGrounding.mockResolvedValue({ activeSkoots: [], learningContext: "", sources: [] });
    generateReply.mockResolvedValue({ content: "Start with the cover banner.", citations: [] });
  });

  it("requires affirmative consent before starting a private conversation", async () => {
    const caller = appRouter.createCaller(context(42));
    await caller.conversation.start({ consentConfirmed: true, title: "Challenge planning" });
    expect(createConversation).toHaveBeenCalledWith(42, "Challenge planning");
    await expect(caller.conversation.start({ consentConfirmed: false } as never)).rejects.toBeTruthy();
  });

  it("binds every message and grounding request to the authenticated user", async () => {
    await appRouter.createCaller(context(42)).conversation.send({ conversationId: 7, content: "What is next?" });
    expect(getLatestConversation).toHaveBeenCalledWith(42);
    expect(appendConversationMessage).toHaveBeenNthCalledWith(1, 42, 7, "user", "What is next?");
    expect(getConversationGrounding).toHaveBeenCalledWith(42);
    expect(appendConversationMessage).toHaveBeenNthCalledWith(2, 42, 7, "skoot", "Start with the cover banner.", []);
  });

  it("does not allow a caller to send into a different conversation", async () => {
    await expect(appRouter.createCaller(context(42)).conversation.send({ conversationId: 99, content: "Cross-user attempt" })).rejects.toThrow("Private conversation not found.");
    expect(appendConversationMessage).not.toHaveBeenCalled();
  });

  it("binds permanent deletion to the authenticated user", async () => {
    await appRouter.createCaller(context(88)).conversation.delete({ conversationId: 7, confirmPermanentDeletion: true });
    expect(deleteConversation).toHaveBeenCalledWith(88, 7);
  });
});
